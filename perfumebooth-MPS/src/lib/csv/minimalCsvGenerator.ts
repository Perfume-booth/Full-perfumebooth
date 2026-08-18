import Papa from 'papaparse';
import { ShopifyProduct, FieldChange } from './types';
import { getRequiredHeadersForFields } from './dependencyEngine';

/**
 * Mapping of internal model key -> Shopify CSV standard column name
 */
export const FIELD_TO_SHOPIFY_HEADER: Record<string, string> = {
  handle: 'Handle',
  title: 'Title',
  bodyHtml: 'Body (HTML)',
  vendor: 'Vendor',
  productCategory: 'Product Category',
  productType: 'Type',
  tags: 'Tags',
  published: 'Published',
  status: 'Status',
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Description',
  sku: 'Variant SKU',
  barcode: 'Variant Barcode',
  price: 'Variant Price',
  compareAtPrice: 'Variant Compare At Price',
  cost: 'Cost per item',
  inventoryQty: 'Variant Inventory Qty',
  inventoryTracker: 'Variant Inventory Tracker',
  inventoryPolicy: 'Variant Inventory Policy',
  fulfillmentService: 'Variant Fulfillment Service',
  requiresShipping: 'Variant Requires Shipping',
  taxable: 'Variant Taxable',
  weight: 'Variant Grams',
  weightUnit: 'Variant Weight Unit',
  option1Name: 'Option1 Name',
  option1Value: 'Option1 Value',
  option2Name: 'Option2 Name',
  option2Value: 'Option2 Value',
  option3Name: 'Option3 Name',
  option3Value: 'Option3 Value',
  imageSrc: 'Variant Image',
};

export interface MinimalExportResult {
  csvString: string;
  affectedProductsCount: number;
  affectedVariantsCount: number;
  exportedHeaders: string[];
}

export function generateMinimalShopifyCsv(
  products: ShopifyProduct[],
  changesList: FieldChange[]
): MinimalExportResult {
  if (changesList.length === 0) {
    return {
      csvString: '',
      affectedProductsCount: 0,
      affectedVariantsCount: 0,
      exportedHeaders: [],
    };
  }

  // 1. Collect set of handles with changes
  const changedHandles = new Set(changesList.map((c) => c.productHandle));

  // 2. Collect set of fields changed across all updates
  const editedFields = new Set(changesList.map((c) => String(c.field)));

  // 3. Determine required headers using Dependency Engine
  const requiredHeadersSet = getRequiredHeadersForFields(editedFields);

  // 4. Map edited fields + required identifiers to Shopify CSV Header names
  const exportedHeadersList: string[] = [];

  // Always put Handle first
  exportedHeadersList.push('Handle');

  // Add identifiers if present
  if (requiredHeadersSet.has('Option1 Name')) exportedHeadersList.push('Option1 Name');
  if (requiredHeadersSet.has('Option1 Value')) exportedHeadersList.push('Option1 Value');

  // Add all edited fields mapped to Shopify headers
  editedFields.forEach((field) => {
    const shopifyHeader = FIELD_TO_SHOPIFY_HEADER[field] || field;
    if (!exportedHeadersList.includes(shopifyHeader)) {
      exportedHeadersList.push(shopifyHeader);
    }
  });

  const exportRows: Record<string, string>[] = [];
  let affectedVariantsCount = 0;

  // 5. Generate row objects ONLY for products with changes
  products.forEach((product) => {
    if (!changedHandles.has(product.handle)) return;

    product.variants.forEach((variant) => {
      affectedVariantsCount++;
      const rowObj: Record<string, string> = {};

      exportedHeadersList.forEach((header) => {
        // Find corresponding internal key
        const internalKey =
          Object.keys(FIELD_TO_SHOPIFY_HEADER).find(
            (k) => FIELD_TO_SHOPIFY_HEADER[k].toLowerCase() === header.toLowerCase()
          ) || header;

        let val = '';

        // Check if value is in Product or Variant
        if (internalKey in product) {
          val = (product as any)[internalKey] ?? '';
        } else if (internalKey in variant) {
          val = (variant as any)[internalKey] ?? '';
        }

        rowObj[header] = String(val);
      });

      exportRows.push(rowObj);
    });
  });

  // 6. Generate CSV string
  const csvString = Papa.unparse(exportRows, {
    columns: exportedHeadersList,
  });

  return {
    csvString,
    affectedProductsCount: changedHandles.size,
    affectedVariantsCount,
    exportedHeaders: exportedHeadersList,
  };
}
