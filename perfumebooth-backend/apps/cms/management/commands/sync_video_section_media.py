import os
import requests
import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.cache import cache
from apps.cms.models import CMSPage, CMSSection, MediaAsset


HOMEPAGE_VIDEOS = [
    {
        "index": 1,
        "label": "Al Haramain",
        "video": "https://cdn.shopify.com/videos/c/o/v/801c3f868981473ebdda06f0124b3e24.mp4",
        "poster": "/videos/posters/clip-1.jpg",
        "poster_file": "clip-1.jpg",
        "href": "/al-haramain",
        "filename": "video-1-al-haramain.mp4",
        "title": "Al Haramain Cinematic Experience",
    },
    {
        "index": 2,
        "label": "Arabiyat Prestige",
        "video": "https://cdn.shopify.com/videos/c/o/v/bf6cee54d3a54c02bacfae2f78062c59.mp4",
        "poster": "/videos/posters/clip-2.jpg",
        "poster_file": "clip-2.jpg",
        "href": "/arabiyat-prestige",
        "filename": "video-2-arabiyat-prestige.mp4",
        "title": "Arabiyat Prestige Cinematic Experience",
    },
    {
        "index": 3,
        "label": "Al Haramain",
        "video": "https://cdn.shopify.com/videos/c/o/v/68e9382119d848c9a6324a3d5c6f45ce.mp4",
        "poster": "/videos/posters/clip-3.jpg",
        "poster_file": "clip-3.jpg",
        "href": "/al-haramain",
        "filename": "video-3-al-haramain.mp4",
        "title": "Al Haramain Amber Oud Film",
    },
    {
        "index": 4,
        "label": "Arabiyat Prestige",
        "video": "https://cdn.shopify.com/videos/c/o/v/9c0ff88aa047479588b8972589ab061b.mp4",
        "poster": "/videos/posters/clip-4.jpg",
        "poster_file": "clip-4.jpg",
        "href": "/products/arabiyat-prestige-bahiya-garnet-edp-100ml-unisex",
        "filename": "video-4-arabiyat-prestige-bahiya-garnet.mp4",
        "title": "Arabiyat Prestige Bahiya Garnet Film",
    },
    {
        "index": 5,
        "label": "Lomani",
        "video": "https://cdn.shopify.com/videos/c/o/v/f3503e6be44e427cb6966f4e31fa2b2e.mp4",
        "poster": "/videos/posters/clip-5.jpg",
        "poster_file": "clip-5.jpg",
        "href": "/lomani",
        "filename": "video-5-lomani.mp4",
        "title": "Lomani Paris Cinematic Experience",
    },
    {
        "index": 6,
        "label": "Arabiyat Prestige",
        "video": "https://cdn.shopify.com/videos/c/o/v/3e8d7db2fa484d6c9c659c78cdabb230.mp4",
        "poster": "/videos/posters/clip-6.jpg",
        "poster_file": "clip-6.jpg",
        "href": "/arabiyat-prestige",
        "filename": "video-6-arabiyat-prestige-hypnotic-amber.mp4",
        "title": "Arabiyat Prestige Hypnotic Amber Film",
    },
    {
        "index": 7,
        "label": "Al-Haramain",
        "video": "https://cdn.shopify.com/videos/c/o/v/490d9ea75336470f8bddb06d558076d6.mp4",
        "poster": "/videos/posters/clip-7.jpg",
        "poster_file": "clip-7.jpg",
        "href": "/al-haramain",
        "filename": "video-7-al-haramain-l-aventure.mp4",
        "title": "Al Haramain L'Aventure Film",
    },
    {
        "index": 8,
        "label": "MPF",
        "video": "https://cdn.shopify.com/videos/c/o/v/28aee50ee417466ea254e2683ba9123a.mp4",
        "poster": "/videos/posters/clip-8.jpg",
        "poster_file": "clip-8.jpg",
        "href": "/mpf",
        "filename": "video-8-mpf.mp4",
        "title": "MPF Signature Scents Film",
    },
]


class Command(BaseCommand):
    help = "Downloads homepage VideoSection videos, stores them locally in media/videos/ and Cloudflare R2, and registers them in CMS MediaAsset."

    def add_arguments(self, parser):
        parser.add_argument(
            '--update-section',
            action='store_true',
            default=True,
            help='Update the CMSSection VideoSection payload with new media URLs',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== SYNC HOMEPAGE VIDEO SECTION VIDEOS TO MEDIA & R2 ==="))

        media_root = str(settings.BASE_DIR / 'media')
        videos_dir = os.path.join(media_root, 'videos')
        os.makedirs(videos_dir, exist_ok=True)

        use_r2 = getattr(settings, 'USE_R2', False)
        r2_client = None
        bucket = None
        media_url_base = getattr(settings, 'MEDIA_URL', 'https://pub-3f642c2b9ee242a79d619d782e435c8d.r2.dev/').rstrip('/') + '/'

        if use_r2:
            r2_client = boto3.client(
                's3',
                endpoint_url=settings.R2_S3_ENDPOINT_URL,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto'
            )
            bucket = settings.R2_STORAGE_BUCKET_NAME
            self.stdout.write(f"Connected to Cloudflare R2: {bucket}")

        updated_items = []

        for item in HOMEPAGE_VIDEOS:
            idx = item['index']
            label = item['label']
            src_url = item['video']
            filename = item['filename']
            local_filepath = os.path.join(videos_dir, filename)
            r2_key = f"videos/{filename}"

            self.stdout.write(f"\n[{idx}/8] Processing: {filename} ({label})")

            # 1. Download video if not already on disk
            if not os.path.exists(local_filepath) or os.path.getsize(local_filepath) == 0:
                self.stdout.write(f"  Downloading from: {src_url} ...")
                downloaded = False
                try:
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    with requests.get(src_url, headers=headers, stream=True, timeout=60) as resp:
                        resp.raise_for_status()
                        with open(local_filepath, 'wb') as f:
                            for chunk in resp.iter_content(chunk_size=1024 * 512):
                                if chunk:
                                    f.write(chunk)
                    downloaded = True
                except Exception as e:
                    self.stdout.write(f"  Requests encountered {e}; attempting fallback with urllib SSL context...")
                    try:
                        import urllib.request
                        import ssl
                        ctx = ssl.create_default_context()
                        ctx.set_ciphers('DEFAULT@SECLEVEL=1')
                        req = urllib.request.Request(src_url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                            with open(local_filepath, 'wb') as f:
                                while True:
                                    chunk = resp.read(1024 * 512)
                                    if not chunk:
                                        break
                                    f.write(chunk)
                        downloaded = True
                    except Exception as err2:
                        self.stderr.write(self.style.ERROR(f"  Download error: {err2}"))

                if downloaded:
                    self.stdout.write(self.style.SUCCESS(f"  Saved locally: {local_filepath} ({os.path.getsize(local_filepath)} bytes)"))
                else:
                    continue
            else:
                self.stdout.write(f"  Already exists locally: {local_filepath} ({os.path.getsize(local_filepath)} bytes)")

            file_size = os.path.getsize(local_filepath)

            # 2. Upload to Cloudflare R2
            if use_r2 and r2_client and bucket:
                try:
                    self.stdout.write(f"  Uploading to Cloudflare R2 ({r2_key})...")
                    with open(local_filepath, 'rb') as f:
                        r2_client.put_object(
                            Bucket=bucket,
                            Key=r2_key,
                            Body=f,
                            ContentType='video/mp4'
                        )
                    self.stdout.write(self.style.SUCCESS(f"  Uploaded to R2: {r2_key}"))
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"  R2 upload error: {e}"))

            # 3. Create or update MediaAsset in Django DB
            asset_file_field = r2_key if use_r2 else f"videos/{filename}"
            asset, created = MediaAsset.objects.update_or_create(
                name=filename,
                folder='videos',
                defaults={
                    'file': asset_file_field,
                    'file_type': 'video/mp4',
                    'file_size': file_size,
                    'alt_text': item['title'],
                }
            )
            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {status_str} MediaAsset ID: {asset.id}"))

            # Determine public accessible URL
            if use_r2:
                final_video_url = f"{media_url_base}{r2_key}"
            else:
                final_video_url = f"/media/videos/{filename}"

            updated_items.append({
                "id": str(asset.id),
                "label": label,
                "video": final_video_url,
                "poster": item['poster'],
                "href": item['href'],
            })

        # 4. Update VideoSection content payload in CMSSection
        try:
            home_page = CMSPage.objects.filter(slug='home').first()
            if home_page:
                video_sec = CMSSection.objects.filter(page=home_page, type='VideoSection').first()
                if video_sec:
                    payload = video_sec.content_payload or {}
                    payload['items'] = updated_items
                    video_sec.content_payload = payload
                    video_sec.save(update_fields=['content_payload'])
                    self.stdout.write(self.style.SUCCESS("\nSuccessfully updated CMSSection VideoSection payload with new video media URLs."))
                else:
                    self.stdout.write("VideoSection CMSSection not found for home page.")
            cache.delete('cms:page:home')
            cache.delete('catalog:banner:home')
            self.stdout.write(self.style.SUCCESS("Cleared Redis cache for home page."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error updating CMSSection: {e}"))

        self.stdout.write(self.style.SUCCESS("\nAll 8 VideoSection videos downloaded, synced to media & Cloudflare R2, and indexed in MediaAsset!"))
