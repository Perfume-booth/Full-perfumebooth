/** Public API stock is already net of reservations. Never invent available units. */
export function availableUnits(item: any): number {
  const value = Number(item?.quantityAvailable ?? item?.stock ?? item?.stock_level ?? item?.stock_count ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function catalogAvailable(product: any): boolean {
  if (!product.is_online) return false;
  return product.variants?.length
    ? product.variants.some((v: any) => v.is_active !== false && availableUnits(v) > 0)
    : availableUnits(product) > 0;
}
