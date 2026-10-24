import io
import os
import re
import requests
import boto3
from PIL import Image
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.cache import cache
from django.utils.text import slugify

from apps.cms.models import CMSPage, CMSSection, MediaFolder, MediaAsset


def clean_slug(text: str) -> str:
    s = slugify(text)
    return re.sub(r'[^a-zA-Z0-9_\-]', '', s) or 'image'


class Command(BaseCommand):
    help = "Downloads, compresses, uploads landing page images to Cloudflare R2, records them in the Media Library database, and updates CMS sections."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run analysis and compression without uploading to R2 or updating database',
        )
        parser.add_argument(
            '--quality',
            type=int,
            default=82,
            help='WebP compression quality (default: 82)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        quality = options['quality']

        if not getattr(settings, 'USE_R2', False) and not dry_run:
            self.stderr.write(self.style.ERROR("USE_R2 is not active in settings. Aborting."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING("=== COMPRESS & SYNC LANDING PAGE IMAGES TO CLOUDFLARE R2 ==="))

        r2_client = None
        bucket = None
        media_url_base = getattr(settings, 'MEDIA_URL', 'https://pub-3f642c2b9ee242a79d619d782e435c8d.r2.dev/').rstrip('/') + '/'

        if not dry_run:
            r2_client = boto3.client(
                's3',
                endpoint_url=settings.R2_S3_ENDPOINT_URL,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto'
            )
            bucket = settings.R2_STORAGE_BUCKET_NAME
            self.stdout.write(f"Connected to Cloudflare R2 Bucket: {bucket}")
            self.stdout.write(f"R2 Public Base URL: {media_url_base}")

        # Ensure MediaFolder hierarchy exists in database
        folder_definitions = [
            {'slug': 'banners', 'name': 'Banners & Hero'},
            {'slug': 'categories', 'name': 'Categories'},
            {'slug': 'gender', 'name': 'Gender Showcase'},
            {'slug': 'scent', 'name': 'Scent Notes'},
            {'slug': 'brands', 'name': 'Brand Logos'},
            {'slug': 'instagram', 'name': 'Instagram & Social'},
        ]

        if not dry_run:
            for fdef in folder_definitions:
                MediaFolder.objects.get_or_create(
                    slug=fdef['slug'],
                    defaults={'name': fdef['name']}
                )
            self.stdout.write(self.style.SUCCESS("Verified CMS MediaFolder hierarchy entries."))

        try:
            page = CMSPage.objects.get(slug='home')
        except CMSPage.DoesNotExist:
            self.stderr.write(self.style.ERROR("CMSPage 'home' does not exist!"))
            return

        total_orig_bytes = 0
        total_comp_bytes = 0
        processed_count = 0
        failed_count = 0

        # Cache of already compressed URLs to avoid re-compressing duplicate URLs
        url_map = {}  # original_url -> {'r2_url': ..., 'r2_key': ..., 'asset': ...}

        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        def compress_and_upload(source_url: str, folder_slug: str, base_name: str, max_dim: int, is_logo: bool = False, alt_text: str = '') -> str:
            nonlocal total_orig_bytes, total_comp_bytes, processed_count, failed_count

            if not source_url or not source_url.startswith('http'):
                return source_url

            # If already processed in this run, reuse
            if source_url in url_map:
                return url_map[source_url]['r2_url']

            # If already pointing to our R2 bucket, skip re-uploading unless forced
            if media_url_base in source_url:
                self.stdout.write(f"  [ALREADY IN R2] {base_name}: {source_url}")
                return source_url

            self.stdout.write(f"\nProcessing [{folder_slug}] {base_name}...")
            self.stdout.write(f"  Source: {source_url[:80]}...")

            try:
                resp = session.get(source_url, timeout=20)
                if resp.status_code != 200:
                    self.stderr.write(self.style.WARNING(f"  Failed to download (HTTP {resp.status_code}): {source_url}"))
                    failed_count += 1
                    return source_url

                orig_bytes = len(resp.content)
                total_orig_bytes += orig_bytes

                # Open with Pillow
                orig_img = Image.open(io.BytesIO(resp.content))
                orig_w, orig_h = orig_img.size

                # Handle color space and transparency
                has_alpha = orig_img.mode in ('RGBA', 'LA') or (orig_img.mode == 'P' and 'transparency' in orig_img.info)
                if has_alpha:
                    img = orig_img.convert('RGBA')
                else:
                    img = orig_img.convert('RGB')

                # Resize if exceeding max_dim while preserving aspect ratio
                new_w, new_h = img.size
                if max(new_w, new_h) > max_dim:
                    if new_w > new_h:
                        new_h = int((max_dim / new_w) * new_h)
                        new_w = max_dim
                    else:
                        new_w = int((max_dim / new_h) * new_w)
                        new_h = max_dim
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                # Compress to WebP
                buf = io.BytesIO()
                if is_logo and has_alpha:
                    # High quality preservation for brand logos with transparency
                    img.save(buf, format='WEBP', quality=max(quality, 90), method=6)
                else:
                    img.save(buf, format='WEBP', quality=quality, method=6)

                comp_bytes = buf.tell()
                total_comp_bytes += comp_bytes
                buf.seek(0)

                savings_pct = ((orig_bytes - comp_bytes) / orig_bytes) * 100 if orig_bytes > 0 else 0
                self.stdout.write(
                    f"  Compressed: {orig_w}x{orig_h} ({orig_bytes / 1024:.1f} KB) -> "
                    f"{new_w}x{new_h} ({comp_bytes / 1024:.1f} KB) | "
                    f"Saved: {savings_pct:.1f}%"
                )

                # Generate hierarchical R2 key
                safe_slug = clean_slug(base_name)
                r2_key = f"media_library/landing-page/{folder_slug}/{safe_slug}.webp"
                r2_url = f"{media_url_base}{r2_key}"

                if not dry_run:
                    # Upload to R2
                    r2_client.put_object(
                        Bucket=bucket,
                        Key=r2_key,
                        Body=buf.getvalue(),
                        ContentType='image/webp'
                    )
                    self.stdout.write(f"  Uploaded to R2: {r2_key}")

                    # Create or update MediaAsset in DB
                    asset, created = MediaAsset.objects.update_or_create(
                        name=f"{base_name}.webp",
                        folder=folder_slug,
                        defaults={
                            'file': r2_key,
                            'file_type': 'image/webp',
                            'file_size': comp_bytes,
                            'width': new_w,
                            'height': new_h,
                            'alt_text': alt_text or base_name,
                        }
                    )
                    status_str = "Created" if created else "Updated"
                    self.stdout.write(self.style.SUCCESS(f"  {status_str} MediaAsset in DB: {asset.name} (id: {asset.id})"))

                processed_count += 1
                url_map[source_url] = {
                    'r2_url': r2_url,
                    'r2_key': r2_key,
                }
                return r2_url

            except Exception as e:
                self.stderr.write(self.style.ERROR(f"  Error processing {source_url}: {e}"))
                failed_count += 1
                return source_url

        # Process each section
        sections = list(page.sections.all())

        for section in sections:
            stype = section.type
            payload = section.content_payload
            changed = False

            if stype == 'HeroBanner':
                slides = payload.get('slides', [])
                for i, sl in enumerate(slides):
                    slide_num = i + 1
                    alt = sl.get('alt_text', f'Hero Slide {slide_num}')
                    label = sl.get('label') or sl.get('href', '').replace('/', '') or f'Slide {slide_num}'

                    if sl.get('image'):
                        new_url = compress_and_upload(
                            sl['image'],
                            folder_slug='banners',
                            base_name=f"hero-{slide_num}-{clean_slug(label)}-desktop",
                            max_dim=1920,
                            is_logo=False,
                            alt_text=f"{alt} (Desktop)"
                        )
                        if new_url != sl['image']:
                            sl['image'] = new_url
                            changed = True

                    if sl.get('mobileImage'):
                        new_url = compress_and_upload(
                            sl['mobileImage'],
                            folder_slug='banners',
                            base_name=f"hero-{slide_num}-{clean_slug(label)}-mobile",
                            max_dim=1080,
                            is_logo=False,
                            alt_text=f"{alt} (Mobile)"
                        )
                        if new_url != sl['mobileImage']:
                            sl['mobileImage'] = new_url
                            changed = True

            elif stype == 'TopCategories':
                categories = payload.get('categories', [])
                for i, cat in enumerate(categories):
                    cat_num = i + 1
                    label = cat.get('label', f'Category {cat_num}')
                    if cat.get('image'):
                        new_url = compress_and_upload(
                            cat['image'],
                            folder_slug='categories',
                            base_name=f"category-{clean_slug(label)}",
                            max_dim=600,
                            is_logo=False,
                            alt_text=f"{label} Category"
                        )
                        if new_url != cat['image']:
                            cat['image'] = new_url
                            changed = True

            elif stype == 'GenderSection':
                cards = payload.get('cards', [])
                for i, card in enumerate(cards):
                    label = card.get('label', f'Gender {i+1}')
                    if card.get('desktopImage'):
                        new_url = compress_and_upload(
                            card['desktopImage'],
                            folder_slug='gender',
                            base_name=f"gender-{clean_slug(label)}-desktop",
                            max_dim=1200,
                            is_logo=False,
                            alt_text=f"Perfumes for {label} (Desktop)"
                        )
                        if new_url != card['desktopImage']:
                            card['desktopImage'] = new_url
                            changed = True

                    if card.get('mobileImage'):
                        new_url = compress_and_upload(
                            card['mobileImage'],
                            folder_slug='gender',
                            base_name=f"gender-{clean_slug(label)}-mobile",
                            max_dim=900,
                            is_logo=False,
                            alt_text=f"Perfumes for {label} (Mobile)"
                        )
                        if new_url != card['mobileImage']:
                            card['mobileImage'] = new_url
                            changed = True

            elif stype == 'ScentGrid':
                items = payload.get('items', [])
                for i, it in enumerate(items):
                    label = it.get('label', f'Scent {i+1}')
                    mood = it.get('mood', '')
                    if it.get('image'):
                        new_url = compress_and_upload(
                            it['image'],
                            folder_slug='scent',
                            base_name=f"scent-family-{clean_slug(label)}",
                            max_dim=800,
                            is_logo=False,
                            alt_text=f"{label} Scent Family - {mood}"
                        )
                        if new_url != it['image']:
                            it['image'] = new_url
                            changed = True

            elif stype == 'BrandSlider':
                brands = payload.get('brands', [])
                for i, b in enumerate(brands):
                    name = b.get('name', f'Brand {i+1}')
                    if b.get('logo'):
                        new_url = compress_and_upload(
                            b['logo'],
                            folder_slug='brands',
                            base_name=f"brand-logo-{clean_slug(name)}",
                            max_dim=500,
                            is_logo=True,
                            alt_text=f"{name} Official Logo"
                        )
                        if new_url != b['logo']:
                            b['logo'] = new_url
                            changed = True

            elif stype == 'InstagramFeed':
                posts = payload.get('posts', [])
                for i, post in enumerate(posts):
                    post_id = post.get('id', f'post-{i+1}')
                    alt = post.get('alt', f'Instagram post {i+1}')
                    if post.get('image'):
                        new_url = compress_and_upload(
                            post['image'],
                            folder_slug='instagram',
                            base_name=f"instagram-{clean_slug(post_id)}",
                            max_dim=800,
                            is_logo=False,
                            alt_text=alt
                        )
                        if new_url != post['image']:
                            post['image'] = new_url
                            changed = True

            if changed and not dry_run:
                section.content_payload = payload
                section.save(update_fields=['content_payload'])
                self.stdout.write(self.style.SUCCESS(f"Saved updated payload for section: {stype}"))

        # Invalidate cache
        if not dry_run:
            cache.delete('cms:page:home')
            cache.delete('catalog:banner:home')
            self.stdout.write(self.style.SUCCESS("Cleared Redis cache for 'cms:page:home' and 'catalog:banner:home'."))

        # Final Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.MIGRATE_HEADING("COMPRESSION & R2 SYNC SUMMARY"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"Total Images Processed: {processed_count}")
        self.stdout.write(f"Failed Downloads:       {failed_count}")
        if total_orig_bytes > 0:
            total_savings = ((total_orig_bytes - total_comp_bytes) / total_orig_bytes) * 100
            self.stdout.write(f"Original Total Size:    {total_orig_bytes / (1024 * 1024):.2f} MB")
            self.stdout.write(f"Compressed Total Size:  {total_comp_bytes / (1024 * 1024):.2f} MB")
            self.stdout.write(self.style.SUCCESS(f"Overall Data Reduction: {total_savings:.1f}% saved!"))
        self.stdout.write("=" * 60)
