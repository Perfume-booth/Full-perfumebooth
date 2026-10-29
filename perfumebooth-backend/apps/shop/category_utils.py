"""
Utility functions for fragrance category normalization and taxonomy cleaning.
"""

def clean_fragrance_category(raw_category: str = '', product_type: str = '', title: str = '') -> str:
    """
    Normalizes raw Google/Shopify taxonomy strings (e.g. 'Health & Beauty > Personal Care > ...')
    and raw product attributes into clean, user-friendly luxury fragrance categories.
    """
    raw_cat = (raw_category or '').strip()
    ptype = (product_type or '').strip().lower()
    t = (title or '').strip().lower()
    c = raw_cat.lower()

    # 1. Extrait de Parfum
    if 'extrait' in ptype or 'perfume extract' in c or 'extrait' in t:
        return 'Extrait de Parfum'

    # 2. Attar & Concentrated Oils
    if 'attar' in ptype or 'attar' in t or 'concentrated perfume' in t or 'cpo' in ptype or 'cpo' in t:
        return 'Attar'

    # 3. Deodorants
    if 'deo' in ptype or 'deodorant' in c or 'deo' in t:
        return 'Deodorant & Body Spray'

    # 4. Body Mists & Sprays
    if 'mist' in ptype or 'body mist' in t or 'mists & sprays' in c or 'body spray' in t or 'body spray' in ptype:
        return 'Body Mist & Spray'

    # 5. Eau de Toilette
    if 'toilette' in ptype or 'eaux de toilette' in c or ' edt' in t or 'edt ' in t or '(edt)' in t:
        return 'Eau de Toilette'

    # 6. Discovery Sets / Scent Shot
    if 'discovery set' in t or 'scent shot' in t or 'sampler' in t:
        return 'Discovery Set'

    # 7. Eau de Cologne
    if 'cologne' in ptype or 'edc' in ptype or 'cologne' in t or ' edc' in t:
        return 'Eau de Cologne'

    # 8. Eau de Parfum
    if 'parfum' in ptype or 'eaux de parfum' in c or ' edp' in t or 'edp ' in t or '(edp)' in t:
        return 'Eau de Parfum'

    # 9. If breadcrumb taxonomy with '>', extract the clean leaf
    if '>' in raw_cat:
        leaf = raw_cat.split('>')[-1].strip()
        leaf_lower = leaf.lower()
        if 'perfume' in leaf_lower or 'cologne' in leaf_lower:
            return 'Eau de Parfum'
        if leaf:
            return leaf

    if raw_cat and raw_cat not in {'Uncategorized', 'Uncategorised', 'Perfume'}:
        return raw_cat

    return 'Eau de Parfum'

