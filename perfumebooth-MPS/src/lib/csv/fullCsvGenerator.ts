import Papa from 'papaparse';
import { ShopifyProduct } from './types';
import { FIELD_TO_SHOPIFY_HEADER } from './minimalCsvGenerator';

export function generateFullShopifyCsv(
  products: ShopifyProduct[],
  rawHeaders: string[]
): string {
  const exportRows: Record<string, string>[] = [];

  products.forEach((product) => {
    product.variants.forEach((variant) => {
      // Start with original raw row to preserve unedited custom columns
      const rowObj: Record<string, string> = { ...variant.rawRow, ...product.rawRow };

      // Overlay any updated internal model properties
      Object.keys(FIELD_TO_SHOPIFY_HEADER).forEach((internalKey) => {
        const header = FIELD_TO_SHOPIFY_HEADER[internalKey];
        if (internalKey in product) {
          rowObj[header] = String((product as any)[internalKey] ?? '');
        } else if (internalKey in variant) {
          rowObj[header] = String((variant as any)[internalKey] ?? '');
        }
      });

      exportRows.push(rowObj);
    });
  });

  return Papa.unparse(exportRows, {
    columns: rawHeaders.length > 0 ? rawHeaders : undefined,
  });
}
