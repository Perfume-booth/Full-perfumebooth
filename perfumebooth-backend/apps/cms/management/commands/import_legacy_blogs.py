"""Import published legacy articles without overwriting existing CMS posts."""
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
from django.utils.dateparse import parse_datetime
from apps.cms.models import BlogPost, MediaAsset, MediaFolder


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--source', required=True)
        parser.add_argument('--apply', action='store_true')

    def handle(self, *args, **options):
        env = RepositoryEnv(str(Path(options['source']) / '.env.local'))
        def setting(*names):
            return next((env[n].strip() for n in names if n in env and env[n].strip()), '')
        domain = re.sub(r'^https?://', '', setting('SHOPIFY_STORE_DOMAIN', 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN')).rstrip('/')
        token = setting('SHOPIFY_STOREFRONT_ACCESS_TOKEN', 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN')
        if not re.fullmatch(r'[a-zA-Z0-9.-]+', domain) or not token:
            raise CommandError('Missing legacy Storefront configuration')
        version = setting('NEXT_PUBLIC_SHOPIFY_API_VERSION') or '2024-04'
        query = '''query($after:String){articles(first:100,after:$after){nodes{handle title contentHtml excerpt tags publishedAt authorV2{name} image{url} blog{handle}} pageInfo{hasNextPage endCursor}}}'''
        articles, cursor = [], None
        while True:
            response = requests.post(f'https://{domain}/api/{version}/graphql.json', headers={'X-Shopify-Storefront-Access-Token': token}, json={'query': query, 'variables': {'after': cursor}}, timeout=30)
            response.raise_for_status()
            payload = response.json()
            if payload.get('errors'):
                raise CommandError('Article metadata query failed')
            data = payload['data']['articles']
            articles.extend(data['nodes'])
            if not data['pageInfo']['hasNextPage']:
                break
            next_cursor = data['pageInfo']['endCursor']
            if not next_cursor or next_cursor == cursor:
                raise CommandError('Invalid pagination cursor')
            cursor = next_cursor
        self.stdout.write(f'Discovered {len(articles)} published articles.')
        if not options['apply']:
            return
        if not settings.USE_R2 or not hasattr(default_storage, 'bucket_name'):
            raise CommandError('R2 must be active')
        MediaFolder.objects.get_or_create(slug='blog-images', defaults={'name': 'Blog Images'})
        migrated = {}
        def image_url(url):
            if url in migrated:
                return migrated[url]
            if url.startswith('//'):
                url = 'https:' + url
            if urlparse(url).hostname != 'cdn.shopify.com' or urlparse(url).scheme != 'https':
                raise ValueError('Unsupported image source')
            with requests.get(url, stream=True, timeout=30, allow_redirects=False) as response:
                if response.status_code != 200:
                    raise ValueError('Image download failed')
                content = bytearray()
                for chunk in response.iter_content(65536):
                    content.extend(chunk)
                    if len(content) > 20 * 1024 * 1024:
                        raise ValueError('Image too large')
            content = bytes(content)
            with Image.open(io.BytesIO(content)) as img:
                width, height, fmt = img.width, img.height, img.format
                img.verify()
            extension = {'JPEG':'jpg','PNG':'png','WEBP':'webp','GIF':'gif','AVIF':'avif'}[fmt]
            digest = hashlib.sha256(content).hexdigest()
            key = f'blog-images/{digest}.{extension}'
            if not default_storage.exists(key):
                if default_storage.save(key, ContentFile(content)) != key:
                    raise ValueError('Unexpected storage key')
            with default_storage.open(key, 'rb') as saved:
                if hashlib.sha256(saved.read()).hexdigest() != digest:
                    raise ValueError('R2 checksum mismatch')
            asset, _ = MediaAsset.objects.get_or_create(file=key, defaults={'name': Path(urlparse(url).path).name[:255], 'folder':'blog-images','file_type':Image.MIME[fmt],'file_size':len(content),'width':width,'height':height})
            migrated[url] = asset.file.url
            return asset.file.url
        created = skipped = failed = 0
        for article in articles:
            slug = article['handle']
            if BlogPost.objects.filter(slug=slug).exists():
                skipped += 1
                self.stdout.write(f'SKIPPED existing: {slug}')
                continue
            try:
                html = article['contentHtml']
                urls = set(re.findall(r'(?:https:)?//cdn\.shopify\.com/[^\s"<>]+', html))
                for url in sorted(urls, key=len, reverse=True):
                    html = html.replace(url, image_url(url.replace('&amp;', '&')))
                cover = image_url(article['image']['url']) if article.get('image') else ''
                post = BlogPost.objects.create(slug=slug,title=article['title'],author=(article.get('authorV2') or {}).get('name') or 'PerfumeBooth Editorial',cover_image=cover,excerpt=article['excerpt'] or '',content_html=html,tags=article['tags'],is_published=True)
                published = parse_datetime(article['publishedAt'])
                if published:
                    BlogPost.objects.filter(pk=post.pk).update(published_at=published)
                created += 1
                self.stdout.write(f'IMPORTED: {slug}')
            except Exception as exc:
                failed += 1
                self.stderr.write(f'FAILED: {slug} ({type(exc).__name__})')
        self.stdout.write(f'Created={created}; skipped={skipped}; failed={failed}; images processed={len(migrated)}')
        if failed:
            raise CommandError('Some articles failed; existing and successfully imported posts were preserved.')
