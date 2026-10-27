"""One-time legacy review migration into native records, with no runtime SaaS dependency."""
import hashlib
import json
from datetime import datetime, time
from urllib.parse import unquote, urlparse

from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from .models import Product, ProductReview


def first(row, *keys, default=''):
    for key in keys:
        if key in row and row[key] is not None and row[key] != '':
            return row[key]
    return default


def normalize_review(row, source_store, product_map=None):
    """Do not guess products, ratings, dates, publication or verification."""
    reviewer = row.get('reviewer') or {}
    product = row.get('product') or {}
    handle = str(first(row, 'product_handle', 'Product Handle', 'handle', default=product.get('handle', ''))).strip()
    if not handle:
        path = urlparse(str(first(row, 'product_url', 'Product URL'))).path
        if '/products/' in path:
            handle = unquote(path.split('/products/', 1)[1].split('/')[0])
    if not handle:
        handle = (product_map or {}).get(str(row.get('product_id', '')), '')
    if not handle:
        raise ValueError('Missing product handle or explicit product mapping; store reviews need separate handling.')
    rating = str(first(row, 'rating', 'Rating')).strip()
    if rating not in {'1', '2', '3', '4', '5'}:
        raise ValueError('Rating must be an integer from 1 to 5.')
    date_text = str(first(row, 'review_date', 'Review Date', 'created_at')).strip()
    try:
        created_at = parse_datetime(date_text)
        if created_at is None:
            date = parse_date(date_text)
            created_at = datetime.combine(date, time.min) if date else None
    except ValueError:
        created_at = None
    if created_at is None:
        raise ValueError('Missing or invalid original date; use ISO format.')
    if timezone.is_naive(created_at):
        created_at = timezone.make_aware(created_at)
    title = str(first(row, 'title', 'Review Title')).strip()
    name = str(first(row, 'reviewer_name', 'Reviewer Name', 'name', default=reviewer.get('name', 'Customer'))).strip()
    if len(title) > 255 or len(name) > 255:
        raise ValueError('Title or reviewer name exceeds 255 characters.')
    body = str(first(row, 'body', 'Review Body', 'comment', 'text')).strip()
    verified = str(first(row, 'verified_buyer', 'Verified Buyer', 'verified')).strip().lower()
    published = str(first(row, 'published', 'curated', 'Status', 'status')).strip().lower()
    source_id = first(row, 'id', 'review_id', 'Review ID')
    if not source_id:
        identity = [handle, name, first(row, 'reviewer_email', 'email', default=reviewer.get('email', '')),
                    rating, title, body, created_at.isoformat()]
        source_id = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode()).hexdigest()
    namespace = hashlib.sha256(source_store.strip().lower().encode()).hexdigest()[:24]
    key = f'legacy-review:{namespace}:{source_id}'
    if len(key) > 255:
        raise ValueError('Source review ID is too long.')
    return handle, created_at, {
        'import_key': key, 'imported_name': name,
        'rating': int(rating), 'title': title, 'comment': body,
        'is_verified_buyer': verified in {'true', 'yes', '1', 'buyer', 'verified'},
        'is_approved': published in {'true', 'yes', '1', 'published', 'approved', 'ok'},
        'import_metadata': {'source': 'judgeme', 'store': source_store, 'review_id': str(source_id),
                            'pictures': row.get('pictures', []), 'picture_urls': row.get('picture_urls', ''),
                            'published_status': published, 'verified_status': verified},
    }


@transaction.atomic
def import_reviews(records, source_store, *, dry_run=True, product_map=None):
    """Validate the entire batch before writing; never overwrite existing reviews."""
    prepared, errors, seen, store_reviews = [], [], set(), []
    duplicates = 0
    for index, row in enumerate(records, 1):
        try:
            handle, created_at, values = normalize_review(row, source_store, product_map)
            if handle.lower() in {'judgeme-shop-reviews', 'shop-reviews', 'store-reviews'}:
                store_reviews.append((created_at, values))
                continue
            matches = list(Product.objects.filter(slug__iexact=handle)[:2])
            if len(matches) != 1:
                raise ValueError('Product handle must match exactly one catalog product.')
            key = values['import_key']
            existing = ProductReview.objects.filter(import_key=key).first()
            if existing and existing.product_id != matches[0].id:
                raise ValueError('Source review is already assigned to another product.')
            if key in seen or existing:
                duplicates += 1
                continue
            seen.add(key)
            prepared.append((matches[0], created_at, values))
        except (ValueError, TypeError, AttributeError) as exc:
            errors.append({'row': index, 'reason': str(exc)})
    result = {'ready': len(prepared), 'store_reviews': len(store_reviews), 'duplicates': duplicates, 'errors': errors, 'created': 0}
    if errors or dry_run:
        return result
    products = {}
    for product, created_at, values in prepared:
        review, created = ProductReview.objects.get_or_create(import_key=values['import_key'],
                                                            defaults={'product': product, **values})
        if created:
            ProductReview.objects.filter(pk=review.pk).update(created_at=created_at)
            result['created'] += 1
            products[product.pk] = product
    for product in products.values():
        totals = ProductReview.objects.filter(product=product, is_approved=True).aggregate(count=Count('id'), average=Avg('rating'))
        product.attributes = {**(product.attributes or {}), 'rating_count': totals['count'], 'rating': round(totals['average'] or 0, 1)}
        product.save(update_fields=['attributes'])
    return result
