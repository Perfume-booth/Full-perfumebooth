"""Normalize a Shopify product CSV into the catalog importer's domain sheets."""

import hashlib
from collections import OrderedDict

from django.utils.text import slugify


SHOPIFY_SIGNATURE = {'Handle', 'Title', 'Variant Price', 'Image Src'}

PRODUCT_HEADERS = [
    'Handle', 'SKU', 'Title', 'Description', 'Price', 'Compare At Price', 'Stock',
    'Published', 'Brand', 'Category', 'Product Type', 'Gender', 'Tags', 'SEO Title',
    'SEO Description', 'Ideal For', 'Top Notes', 'Middle Notes', 'Base Notes', 'Size',
    'Olfactory Family', 'Fragrance', 'Scent', 'Season', 'Occasion', 'Dispenser Type',
    'Product Form', 'Short Description', 'Cost Per Item', 'Weight', 'Barcode',
    'Material', 'Color',
]

VARIANT_HEADERS = [
    'Product Handle', 'Action', 'Variant SKU', 'Title', 'Option1 Name', 'Option1 Value',
    'Option2 Name', 'Option2 Value', 'Price', 'Compare At Price', 'Stock', 'Status',
]

IMAGE_HEADERS = [
    'Product Handle', 'Variant SKU', 'Action', 'Image URL', 'Image ID', 'Alt Text',
    'Position', 'Primary',
]

SOURCE_FIELDS = {
    'Handle': 'Handle',
    'Title': 'Title',
    'Description': 'Body (HTML)',
    'Price': 'Variant Price',
    'Compare At Price': 'Variant Compare At Price',
    'Stock': 'Variant Inventory Qty',
    'Published': 'Status',
    'Brand': 'Brand Name',
    'Category': 'Product Category',
    'Product Type': 'Type',
    'Gender': 'Filter: Gender (product.metafields.custom.gender)',
    'Tags': 'Tags',
    'SEO Title': 'SEO Title',
    'SEO Description': 'SEO Description',
    'Ideal For': 'Idealfor (product.metafields.custom.idealfor)',
    'Top Notes': 'topnotes (product.metafields.custom.topnotes)',
    'Middle Notes': 'middlenote (product.metafields.custom.middlenote)',
    'Base Notes': 'basenotes (product.metafields.custom.basenotes)',
    'Size': 'size (product.metafields.custom.size)',
    'Olfactory Family': 'Olfactory family (product.metafields.shopify.olfactory-family)',
    'Fragrance': 'Fragrance (product.metafields.shopify.fragrance)',
    'Scent': 'Scent (product.metafields.shopify.scent)',
    'Season': 'Season (product.metafields.shopify.season)',
    'Occasion': 'Occasion (product.metafields.shopify.occasion)',
    'Dispenser Type': 'Dispenser type (product.metafields.shopify.dispenser-type)',
    'Product Form': 'Product form (product.metafields.shopify.product-form)',
    'Short Description': 'ShortDesc (product.metafields.custom.shortdesc)',
    'Cost Per Item': 'Cost per item',
    'Barcode': 'Variant Barcodes',
    'Material': 'Material (product.metafields.shopify.material)',
    'Color': 'Color (product.metafields.shopify.color-pattern)',
}


def is_shopify_export(headers):
    return SHOPIFY_SIGNATURE.issubset(set(headers or []))


def _value(row, name):
    return str(row.get(name) or '').strip()


def _generated_sku(handle, suffix=''):
    digest = hashlib.sha1(f'{handle}:{suffix}'.encode('utf-8')).hexdigest()[:10].upper()
    readable = slugify(handle).replace('-', '').upper()[:24] or 'PRODUCT'
    return f'PB-{readable}-{digest}'


def _published(row):
    status = _value(row, 'Status')
    return status or _value(row, 'Published')


def _weight_kg(row):
    grams = _value(row, 'Variant Grams')
    if not grams:
        return ''
    try:
        return str(round(float(grams) / 1000, 4))
    except ValueError:
        return ''


def _image_position(row):
    value = _value(row, 'Image Position')
    if not value:
        return '0'
    try:
        return str(max(int(float(value)), 0))
    except ValueError:
        return '0'


def normalize_shopify_csv(rows):
    """Return Products, Variants and Images rows understood by product_imports."""
    groups = OrderedDict()
    for source_row_number, row in enumerate(rows, start=2):
        handle = slugify(_value(row, 'Handle'))
        if handle:
            groups.setdefault(handle, []).append((source_row_number, row))

    products, variants, images = [], [], []
    used_skus = set()
    for handle, grouped_rows in groups.items():
        detail_pair = next(((n, r) for n, r in grouped_rows if _value(r, 'Title')), grouped_rows[0])
        _, detail = detail_pair
        variant_pairs = [
            (n, r) for n, r in grouped_rows
            if _value(r, 'Variant SKU') or _value(r, 'Variant Price') or _value(r, 'Option1 Value')
        ]
        meaningful_variants = len(variant_pairs) > 1 or any(
            _value(r, 'Option1 Value').lower() not in {'', 'default title'} for _, r in variant_pairs
        )
        source_sku = _value(detail, 'Variant SKU')
        product_sku = _generated_sku(handle, 'parent') if meaningful_variants else (source_sku or _generated_sku(handle))
        if product_sku.lower() in used_skus:
            product_sku = _generated_sku(handle, 'duplicate-parent')
        used_skus.add(product_sku.lower())

        product = {header: '' for header in PRODUCT_HEADERS}
        for target, source in SOURCE_FIELDS.items():
            product[target] = _value(detail, source)
        product.update({
            'Handle': handle,
            'SKU': product_sku,
            'Published': _published(detail),
            'Brand': _value(detail, 'Brand Name') or _value(detail, 'Vendor'),
            'Weight': _weight_kg(detail),
        })
        products.append(product)

        if meaningful_variants:
            for index, (_, row) in enumerate(variant_pairs, start=1):
                option1_value = _value(row, 'Option1 Value')
                option2_value = _value(row, 'Option2 Value')
                sku = _value(row, 'Variant SKU') or _generated_sku(handle, f'variant-{index}-{option1_value}-{option2_value}')
                if sku.lower() in used_skus:
                    sku = _generated_sku(handle, f'duplicate-variant-{index}-{option1_value}-{option2_value}')
                used_skus.add(sku.lower())
                variants.append({
                    'Product Handle': handle,
                    'Action': 'ADD',
                    'Variant SKU': sku,
                    'Title': option1_value if option1_value.lower() != 'default title' else _value(row, 'Title') or sku,
                    'Option1 Name': _value(row, 'Option1 Name') or 'Size',
                    'Option1 Value': option1_value if option1_value.lower() != 'default title' else (_value(detail, 'size (product.metafields.custom.size)') or 'Default'),
                    'Option2 Name': _value(row, 'Option2 Name'),
                    'Option2 Value': option2_value,
                    'Price': _value(row, 'Variant Price'),
                    'Compare At Price': _value(row, 'Variant Compare At Price'),
                    'Stock': _value(row, 'Variant Inventory Qty'),
                    'Status': _published(row) or _published(detail),
                })

        seen_image_urls = set()
        for _, row in grouped_rows:
            url = _value(row, 'Image Src')
            if url and url not in seen_image_urls:
                seen_image_urls.add(url)
                position = _image_position(row)
                images.append({
                    'Product Handle': handle,
                    'Variant SKU': '',
                    'Action': 'ADD',
                    'Image URL': url,
                    'Image ID': '',
                    'Alt Text': _value(row, 'Image Alt Text'),
                    'Position': position,
                    'Primary': 'yes' if position in {'1', '1.0'} else 'no',
                })
            variant_url = _value(row, 'Variant Image')
            variant_sku = _value(row, 'Variant SKU')
            if meaningful_variants and variant_url and variant_sku and variant_url not in seen_image_urls:
                seen_image_urls.add(variant_url)
                images.append({
                    'Product Handle': handle,
                    'Variant SKU': variant_sku,
                    'Action': 'REPLACE',
                    'Image URL': variant_url,
                    'Image ID': '',
                    'Alt Text': _value(row, 'Image Alt Text'),
                    'Position': '0',
                    'Primary': 'no',
                })

    return PRODUCT_HEADERS, products, VARIANT_HEADERS, variants, IMAGE_HEADERS, images
