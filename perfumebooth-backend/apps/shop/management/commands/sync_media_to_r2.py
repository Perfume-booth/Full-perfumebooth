import os
import mimetypes
import concurrent.futures
import requests
import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.cache import cache
from apps.shop.models import Product, ProductImage


class Command(BaseCommand):
    help = "Syncs local media files and product images with source URLs to Cloudflare R2 storage."

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit the number of images to sync from source URLs (0 = all)',
        )
        parser.add_argument(
            '--concurrency',
            type=int,
            default=16,
            help='Number of concurrent worker threads (default: 16)',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'USE_R2', False):
            self.stderr.write(self.style.ERROR('USE_R2 is not enabled in settings. Aborting.'))
            return

        r2_client = boto3.client(
            's3',
            endpoint_url=settings.R2_S3_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name='auto'
        )
        bucket = settings.R2_STORAGE_BUCKET_NAME

        self.stdout.write(self.style.NOTICE(f'Fetching existing object keys in R2 bucket "{bucket}"...'))
        existing_keys = set()
        paginator = r2_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                existing_keys.add(obj['Key'])

        self.stdout.write(self.style.SUCCESS(f'Found {len(existing_keys)} existing objects in R2.'))

        # -------------------------------------------------------------
        # 1. Sync local media files
        # -------------------------------------------------------------
        media_root = str(settings.BASE_DIR / 'media')
        local_files_to_upload = []
        if os.path.exists(media_root):
            for root, _, files in os.walk(media_root):
                for filename in files:
                    full_path = os.path.join(root, filename)
                    rel_key = os.path.relpath(full_path, media_root).replace('\\', '/')
                    if rel_key not in existing_keys:
                        local_files_to_upload.append((full_path, rel_key))

        concurrency = options['concurrency']

        if local_files_to_upload:
            self.stdout.write(self.style.NOTICE(f'Uploading {len(local_files_to_upload)} local media files to R2 ({concurrency} threads)...'))

            def _upload_local(item):
                full_path, rel_key = item
                try:
                    content_type, _ = mimetypes.guess_type(full_path)
                    content_type = content_type or 'application/octet-stream'
                    with open(full_path, 'rb') as f:
                        r2_client.put_object(
                            Bucket=bucket,
                            Key=rel_key,
                            Body=f.read(),
                            ContentType=content_type
                        )
                    return True, rel_key, None
                except Exception as exc:
                    return False, rel_key, str(exc)

            up_success = 0
            up_fail = 0
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
                futures = {executor.submit(_upload_local, item): item for item in local_files_to_upload}
                for future in concurrent.futures.as_completed(futures):
                    ok, rel_key, err = future.result()
                    if ok:
                        up_success += 1
                        existing_keys.add(rel_key)
                        if up_success % 50 == 0 or up_success == len(local_files_to_upload):
                            self.stdout.write(f'  [Local Upload Progress] {up_success}/{len(local_files_to_upload)} uploaded to R2...')
                    else:
                        up_fail += 1
                        self.stderr.write(self.style.WARNING(f'  Failed uploading {rel_key}: {err}'))

            self.stdout.write(self.style.SUCCESS(f'Local upload complete: {up_success} uploaded to R2 (Failed: {up_fail}).'))
        else:
            self.stdout.write(self.style.SUCCESS('All local media files already exist in Cloudflare R2!'))

        # -------------------------------------------------------------
        # 2. Sync product images from source_url (Shopify CDN)
        # -------------------------------------------------------------
        limit = options['limit']
        concurrency = options['concurrency']

        # Map each source_url to target R2 keys
        images_to_sync = []
        seen_targets = set()

        pi_qs = ProductImage.objects.exclude(source_url='').exclude(source_url=None).select_related('product')
        if limit > 0:
            pi_qs = pi_qs[:limit]

        for pi in pi_qs:
            key = str(pi.image)
            if key and key not in existing_keys and key not in seen_targets:
                seen_targets.add(key)
                is_prim = bool(pi.is_primary or pi.position == 1)
                images_to_sync.append((pi.source_url, key, pi.product, is_prim))

        self.stdout.write(self.style.NOTICE(f'Found {len(images_to_sync)} product images to download and upload to R2.'))
        if not images_to_sync:
            self.stdout.write(self.style.SUCCESS('All product images are already in Cloudflare R2!'))
            cache.clear()
            return

        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

        def _process_image(item):
            src_url, target_key, product, is_prim = item
            try:
                resp = session.get(src_url, timeout=15)
                if resp.status_code != 200:
                    return False, target_key, f"HTTP {resp.status_code}"
                content = resp.content
                ctype = resp.headers.get('Content-Type') or mimetypes.guess_type(target_key)[0] or 'image/jpeg'

                # Put to target ProductImage key
                r2_client.put_object(
                    Bucket=bucket,
                    Key=target_key,
                    Body=content,
                    ContentType=ctype
                )

                # Save to local media directory so all images exist in both media and R2
                try:
                    local_path = os.path.join(media_root, target_key)
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    if not os.path.exists(local_path):
                        with open(local_path, 'wb') as lf:
                            lf.write(content)
                except Exception:
                    pass

                # ONLY upload to Product.image if this is the primary product image
                if is_prim and product and product.image:
                    prod_key = str(product.image)
                    if prod_key and prod_key != target_key:
                        r2_client.put_object(
                            Bucket=bucket,
                            Key=prod_key,
                            Body=content,
                            ContentType=ctype
                        )
                        try:
                            prod_local = os.path.join(media_root, prod_key)
                            os.makedirs(os.path.dirname(prod_local), exist_ok=True)
                            if not os.path.exists(prod_local):
                                with open(prod_local, 'wb') as lf:
                                    lf.write(content)
                        except Exception:
                            pass

                return True, target_key, None
            except Exception as e:
                return False, target_key, str(e)

        success_count = 0
        fail_count = 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = {executor.submit(_process_image, item): item for item in images_to_sync}
            for future in concurrent.futures.as_completed(futures):
                ok, key, err = future.result()
                if ok:
                    success_count += 1
                    if success_count % 25 == 0 or success_count == len(images_to_sync):
                        self.stdout.write(f'  [Progress] Synced {success_count}/{len(images_to_sync)} images...')
                else:
                    fail_count += 1
                    self.stderr.write(self.style.WARNING(f'  Failed {key}: {err}'))

        self.stdout.write(self.style.SUCCESS(
            f'Sync complete! Successfully synced {success_count} images to Cloudflare R2 (Failed: {fail_count}).'
        ))
        cache.clear()
        self.stdout.write(self.style.SUCCESS('Catalog cache cleared.'))
