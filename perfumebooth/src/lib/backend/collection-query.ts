import type { Product } from './types';

export function filterCollection(products: Product[], filters: any[] = []): Product[] {
  const fields = ['tag', 'productVendor', 'productType', 'gender', 'category', 'season', 'occasion', 'available'];
  const value = (p: Product, field: string): string => {
    if (field === 'productVendor') return p.vendor || '';
    if (field === 'productType') return p.productType || '';
    return String((p as any)[field] || p.metafields?.find(m => m.key === field)?.value || '');
  };
  return products.filter(p => {
    const matchesFields = fields.every(field => {
      const choices = filters.filter(f => f[field] !== undefined).map(f => f[field]);
      return !choices.length || choices.some(choice => field === 'available'
        ? p.availableForSale === choice
        : field === 'tag'
          ? p.tags?.some(tag => tag.toLowerCase() === String(choice).toLowerCase())
          : value(p, field).toLowerCase() === String(choice).toLowerCase());
    });
    return matchesFields && filters.every(f => {
      const price = Number(p.priceRange.minVariantPrice.amount);
      if (f.price && ((f.price.min != null && price < f.price.min) || (f.price.max != null && price > f.price.max))) return false;
      if (f.rating != null && Number(p.rating || 0) < f.rating) return false;
      if (f.q && !`${p.title} ${p.vendor} ${(p.tags || []).join(' ')}`.toLowerCase().includes(String(f.q).toLowerCase())) return false;
      return true;
    });
  });
}

export function collectionFacets(products: Product[]) {
  const counts = (read: (p: Product) => string) => {
    const values = new Map<string, { value: string; count: number }>();
    products.forEach(p => {
      const value = read(p).trim();
      if (!value) return;
      const key = value.toLowerCase();
      const previous = values.get(key);
      values.set(key, { value: previous?.value || value, count: (previous?.count || 0) + 1 });
    });
    return [...values.values()];
  };
  const meta = (p: Product, key: string) => p.metafields?.find(m => m.key === key)?.value || '';
  return {
    genders: counts(p => p.gender || meta(p, 'gender')),
    brands: counts(p => p.vendor || ''), productTypes: counts(p => p.productType || ''),
    categories: counts(p => p.category || meta(p, 'category')),
    occasions: counts(p => meta(p, 'occasion')), seasons: counts(p => meta(p, 'season')),
  };
}
