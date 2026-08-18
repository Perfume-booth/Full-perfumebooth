import { ShopifyProduct, FieldChange, ValidationIssue } from './types';

export function validateShopifyChanges(
  products: ShopifyProduct[],
  changesList: FieldChange[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Track SKUs across variants to catch duplicates
  const skuMap = new Map<string, string>(); // sku -> handle

  products.forEach((product) => {
    // Validate product title & handle
    if (!product.handle) {
      issues.push({
        id: `err_handle_${product.internalId}`,
        severity: 'ERROR',
        handle: product.handle || 'UNNAMED',
        field: 'handle',
        message: 'Product is missing a valid Handle.',
        suggestedFix: 'Provide a lowercase hyphenated handle.',
      });
    }

    product.variants.forEach((v) => {
      if (v.sku) {
        if (skuMap.has(v.sku) && skuMap.get(v.sku) !== product.handle) {
          issues.push({
            id: `err_sku_dup_${v.sku}`,
            severity: 'ERROR',
            handle: product.handle,
            sku: v.sku,
            field: 'sku',
            message: `Duplicate SKU '${v.sku}' detected across multiple products.`,
            suggestedFix: 'Ensure every product variant has a unique SKU.',
          });
        } else {
          skuMap.set(v.sku, product.handle);
        }
      }

      // Check numeric price valid format
      if (v.price && isNaN(Number(v.price))) {
        issues.push({
          id: `err_price_nan_${v.internalId}`,
          severity: 'ERROR',
          handle: product.handle,
          sku: v.sku,
          field: 'price',
          message: `Invalid price '${v.price}'. Must be a valid numeric format.`,
          suggestedFix: 'Format price as numeric decimal (e.g. 799 or 799.00).',
        });
      }
    });
  });

  // Check specific change set warnings & destructive actions
  changesList.forEach((c) => {
    if (c.state === 'CLEARED') {
      issues.push({
        id: `warn_clear_${c.id}`,
        severity: 'WARNING',
        handle: c.productHandle,
        sku: c.variantSku,
        field: String(c.field),
        message: `Field '${String(c.field)}' is selected but empty. Exporting will CLEAR the existing value in Shopify!`,
        suggestedFix: 'If you do not want to delete this field value in Shopify, reset this field.',
      });
    }

    if (c.field === 'handle') {
      issues.push({
        id: `warn_handle_edit_${c.id}`,
        severity: 'WARNING',
        handle: c.productHandle,
        field: 'handle',
        message: `Changing Handle from '${c.oldValue}' to '${c.newValue}' will break existing product URL links in Shopify!`,
        suggestedFix: 'Set up 301 URL redirects in Shopify after exporting.',
      });
    }

    if (c.field === 'sku') {
      issues.push({
        id: `warn_sku_edit_${c.id}`,
        severity: 'WARNING',
        handle: c.productHandle,
        sku: c.variantSku,
        field: 'sku',
        message: `SKU updated from '${c.oldValue}' to '${c.newValue}'.`,
        suggestedFix: 'Ensure inventory tracking software is synced with new SKU.',
      });
    }
  });

  return issues;
}
