"""Copy legacy collection banner originals into R2 and the CMS media library."""
import hashlib
import io
import re
from pathlib import Path
from urllib.parse import urlparse

import requests
from decouple import RepositoryEnv
from PIL import Image
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from apps.cms.models import MediaAsset, MediaFolder


def active_source(path):
    return re.sub(r'/\*.*?\*/', '', path.read_text(encoding='utf-8-sig'), flags=re.S)


def source_banners(root):
    sources = {}
    constants = active_source(root / 'src/lib/constants.ts').split('export const BRAND_MEDIA', 1)[1].split('\n};', 1)[0]
    for handle, url in re.findall(r'"([^"]+)"\s*:\s*\{[^}]*desktopSrc:\s*"(https://[^"]+)"', constants):
        sources.setdefault(url, set()).add(handle)
    for path in (root / 'src/app').rglob('page.tsx'):
        source = active_source(path)
        for block in re.findall(r'bannerImages=\{\[(.*?)\]\}', source, flags=re.S):
            for url in re.findall(r'"(https://[^"]+)"', block):
                sources.setdefault(url, set()).add(path.parent.name)
    return sources


class Command(BaseCommand):
    help = 'Discover legacy banner originals; --apply uploads to R2 and creates media records only.'

    def add_arguments(self, parser):
        parser.add_argument('--source', required=True)
        parser.add_argument('--apply', action='store_true')
        parser.add_argument('--assign', action='store_true', help='Populate empty page banners with imported images.')

    def handle(self, *args, **options):
        root = Path(options['source']).resolve()
        sources = source_banners(root)
        env = RepositoryEnv(str(root / '.env.local'))
        def setting(*names):
            return next((env[name].strip() for name in names if name in env and env[name].strip()), '')
        domain = setting('SHOPIFY_STORE_DOMAIN', 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN')
        domain = re.sub(r'^https?://', '', domain).rstrip('/')
        token = setting('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN')
        version = setting('NEXT_PUBLIC_SHOPIFY_API_VERSION') or '2024-04'
        if not re.fullmatch(r'[a-zA-Z0-9.-]+', domain) or not token:
            raise CommandError('Legacy Storefront domain/token missing or invalid; nothing imported.')
        query = '''query($after:String){collections(first:100,after:$after){nodes{handle title image{url altText}} pageInfo{hasNextPage endCursor}}}'''
        cursor = None
        native_count = 0
        while True:
            response = requests.post(f'https://{domain}/api/{version}/graphql.json',
                headers={'X-Shopify-Storefront-Access-Token': token},
                json={'query': query, 'variables': {'after': cursor}}, timeout=30)
            response.raise_for_status()
            payload = response.json()
            if payload.get('errors'):
                raise CommandError('Storefront collection query failed; nothing imported.')
            data = payload['data']['collections']
            for collection in data['nodes']:
                if collection.get('image'):
                    sources.setdefault(collection['image']['url'], set()).add(collection['handle'])
                    native_count += 1
            if not data['pageInfo']['hasNextPage']:
                break
            next_cursor = data['pageInfo']['endCursor']
            if not next_cursor or next_cursor == cursor:
                raise CommandError('Invalid collection pagination cursor.')
            cursor = next_cursor
        self.stdout.write(f'Discovered {len(sources)} unique URLs; {native_count} native collections have images.')
        if not options['apply']:
            for url, handles in sources.items():
                self.stdout.write(f'{", ".join(sorted(handles))}: {url}')
            return
        if not settings.USE_R2 or not hasattr(default_storage, 'bucket_name'):
            raise CommandError('R2 is not the active storage; refusing local-only import.')
        MediaFolder.objects.get_or_create(slug='collection-banners', defaults={'name': 'Collection Banners'})
        created = reused = failed = 0
        assignments = {}
        for url, handles in sources.items():
            label = ', '.join(sorted(handles))
            try:
                if urlparse(url).scheme != 'https' or urlparse(url).hostname != 'cdn.shopify.com':
                    raise ValueError('Unsupported image host')
                with requests.get(url, timeout=30, stream=True, allow_redirects=False) as response:
                    response.raise_for_status()
                    if response.status_code != 200:
                        raise ValueError('Expected direct image response')
                    contents = bytearray()
                    for chunk in response.iter_content(65536):
                        contents.extend(chunk)
                        if len(contents) > 20 * 1024 * 1024:
                            raise ValueError('Image exceeds 20 MB')
                content = bytes(contents)
                with Image.open(io.BytesIO(content)) as img:
                    width, height, fmt = img.width, img.height, img.format
                    img.verify()
                extensions = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp', 'GIF': 'gif', 'AVIF': 'avif'}
                if fmt not in extensions:
                    raise ValueError('Unsupported image format')
                digest = hashlib.sha256(content).hexdigest()
                key = f'collection-banners/{digest}.{extensions[fmt]}'
                if len(key) > MediaAsset._meta.get_field('file').max_length:
                    raise ValueError('Storage key exceeds media field limit')
                if not default_storage.exists(key):
                    saved = default_storage.save(key, ContentFile(content))
                    if saved != key:
                        raise ValueError('Unexpected storage key')
                # Verify the stored bytes, not just the upload response.
                with default_storage.open(key, 'rb') as stored:
                    if hashlib.sha256(stored.read()).hexdigest() != digest:
                        raise ValueError('Stored image checksum mismatch')
                asset, new = MediaAsset.objects.get_or_create(file=key, defaults={
                    'name': f'Collection banner - {label}'[:255], 'folder': 'collection-banners',
                    'file_type': Image.MIME.get(fmt, f'image/{extensions[fmt]}'),
                    'file_size': len(content), 'width': width, 'height': height,
                    'alt_text': f'Collection banner: {label}'[:255],
                })
                created += int(new)
                reused += int(not new)
                for handle in handles:
                    page = {'perfumes-for-men': 'men', 'perfumes-for-women': 'women', 'lattafa-1': 'lattafa', 'body-mist': 'mist'}.get(handle, handle)
                    if page == 'all':
                        assignments.setdefault(page, []).append(key)
                    else:
                        assignments[page] = [key]
                self.stdout.write(f'{"IMPORTED" if new else "REUSED"}: {label} ({width}x{height})')
            except Exception as exc:
                failed += 1
                # Never print provider credentials or request headers.
                self.stderr.write(f'FAILED: {label} ({type(exc).__name__})')
        if options['assign']:
            from apps.shop.models import PageBanner, PageBannerImage
            from django.core.cache import cache
            for page, keys in assignments.items():
                banner, _ = PageBanner.objects.get_or_create(page_slug=page, defaults={'title': page.replace('-', ' ').title()})
                if banner.images.exists():
                    continue
                for index, key in enumerate(dict.fromkeys(keys)):
                    PageBannerImage.objects.create(banner=banner, image=key, sort_order=index)
                cache.delete(f'catalog:banner:{page}')
                self.stdout.write(f'ASSIGNED: {page}')
        self.stdout.write(f'Created={created}; reused={reused}; failed={failed}. Existing populated banners preserved.')
        if failed:
            raise CommandError('Some banner imports failed; successful imports are preserved and reruns are safe.')
