"""Shared public membership rules for collection summaries and detail pages."""
from django.db.models import Q
from .models import Product


def collection_products(collection):
    if collection.collection_type == 'manual':
        products = collection.products.filter(is_online=True)
    else:
        products = Product.objects.filter(is_online=True)
        field = {'gender': 'gender', 'brand': 'brand', 'category': 'category',
                 'type': 'productType'}.get(collection.collection_type)
        if field:
            membership = Q(**{f'attributes__{field}__iexact': collection.name})
            if field == 'gender' and collection.name.strip().lower() in {'men', 'women', 'unisex'}:
                membership |= Q(title__icontains='unisex')
            products = products.filter(membership)
        elif collection.collection_type == 'note':
            products = products.filter(attributes__tags__contains=[collection.name])
        else:
            products = products.none()
    if collection.excluded_products:
        products = products.exclude(id__in=collection.excluded_products)
    return products.order_by('id')
