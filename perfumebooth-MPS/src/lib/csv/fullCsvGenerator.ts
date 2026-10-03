import Papa from 'papaparse';
import { CatalogProduct } from './types';
import { FIELD_TO_CSV_HEADER } from './minimalCsvGenerator';

export function generateFullCatalogCsv(
  products: CatalogProduct[],
  rawHeaders: string[]
): string {
  const exportRows: Record<string, string>[] = [];

  products.forEach((product) => {
    product.variants.forEach((variant) => {
      // Start with original raw row to preserve unedited custom columns
      const rowObj: Record<string, string> = { ...variant.rawRow, ...product.rawRow };

      // Overlay any updated internal model properties
      Object.keys(FIELD_TO_CSV_HEADER).forEach((internalKey) => {
        const header = FIELD_TO_CSV_HEADER[internalKey];
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
