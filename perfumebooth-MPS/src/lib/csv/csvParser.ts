import Papa from 'papaparse';
import { CatalogProduct, CatalogVariant } from './types';

/**
 * Product CSV header aliases
 */
const GET_FIELD = (row: Record<string, any>, keys: string[]): string => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      return String(row[k]).trim();
    }
    // Case-insensitive fallback
    const foundKey = Object.keys(row).find(
      (rk) => rk.toLowerCase().trim() === k.toLowerCase().trim()
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return String(row[foundKey]).trim();
    }
  }
  return '';
};

export interface ParseResult {
  products: CatalogProduct[];
  rawHeaders: string[];
  totalRowsParsed: number;
}

export function parseCatalogCsv(csvContent: string): ParseResult {
  const parseRes = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rawHeaders = parseRes.meta.fields || [];
  const rows = parseRes.data;

  const productMap = new Map<string, CatalogProduct>();

  let idCounter = 1;

  for (const row of rows) {
    const handle = GET_FIELD(row, ['Handle', 'handle']);
    if (!handle) continue; // Skip malformed rows missing Handle

    let product = productMap.get(handle);
    if (!product) {
      product = {
        internalId: `prod_${idCounter++}`,
        handle: handle,
        title: GET_FIELD(row, ['Title', 'title']),
        bodyHtml: GET_FIELD(row, ['Body (HTML)', 'Body HTML', 'description']),
        vendor: GET_FIELD(row, ['Vendor', 'vendor']),
        productCategory: GET_FIELD(row, ['Product Category', 'Category']),
        productType: GET_FIELD(row, ['Type', 'Product Type']),
        tags: GET_FIELD(row, ['Tags', 'tags']),
        published: GET_FIELD(row, ['Published', 'published']),
        status: GET_FIELD(row, ['Status', 'status']) || 'active',
        seoTitle: GET_FIELD(row, ['SEO Title', 'seo_title']),
        seoDescription: GET_FIELD(row, ['SEO Description', 'seo_description']),
        variants: [],
        images: [],
        rawRow: row,
      };
      productMap.set(handle, product);
    }

    // Extract image if present
    const imageSrc = GET_FIELD(row, ['Image Src', 'image_src']);
    if (imageSrc) {
      const position = GET_FIELD(row, ['Image Position', 'image_position']) || '1';
      const altText = GET_FIELD(row, ['Image Alt Text', 'image_alt_text']);
      if (!product.images.some((img) => img.src === imageSrc)) {
        product.images.push({ src: imageSrc, position, altText });
      }
    }

    // Extract variant
    const sku = GET_FIELD(row, ['Variant SKU', 'SKU', 'sku']);
    const option1Name = GET_FIELD(row, ['Option1 Name', 'option1_name']);
    const option1Value = GET_FIELD(row, ['Option1 Value', 'option1_value']);

    const variant: CatalogVariant = {
      internalId: `var_${idCounter++}`,
      productHandle: handle,
      sku: sku,
      barcode: GET_FIELD(row, ['Variant Barcode', 'Barcode', 'barcode']),
      price: GET_FIELD(row, ['Variant Price', 'Price', 'price']),
      compareAtPrice: GET_FIELD(row, ['Variant Compare At Price', 'Compare At Price']),
      cost: GET_FIELD(row, ['Cost per item', 'Variant Cost']),
      inventoryQty: GET_FIELD(row, ['Variant Inventory Qty', 'Inventory Qty', 'stock']),
      inventoryTracker: GET_FIELD(row, ['Variant Inventory Tracker']),
      inventoryPolicy: GET_FIELD(row, ['Variant Inventory Policy']) || 'deny',
      fulfillmentService: GET_FIELD(row, ['Variant Fulfillment Service']) || 'manual',
      requiresShipping: GET_FIELD(row, ['Variant Requires Shipping']) || 'true',
      taxable: GET_FIELD(row, ['Variant Taxable']) || 'true',
      weight: GET_FIELD(row, ['Variant Grams', 'Variant Weight']),
      weightUnit: GET_FIELD(row, ['Variant Weight Unit']) || 'g',
      option1Name: option1Name || 'Title',
      option1Value: option1Value || 'Default Title',
      option2Name: GET_FIELD(row, ['Option2 Name']),
      option2Value: GET_FIELD(row, ['Option2 Value']),
      option3Name: GET_FIELD(row, ['Option3 Name']),
      option3Value: GET_FIELD(row, ['Option3 Value']),
      imageSrc: GET_FIELD(row, ['Variant Image']),
      rawRow: row,
    };

    // Prevent duplicate exact variant rows
    const isDuplicate = product.variants.some(
      (v) =>
        (sku && v.sku === sku) ||
        (v.option1Value === variant.option1Value &&
          v.option2Value === variant.option2Value &&
          v.option3Value === variant.option3Value)
    );

    if (!isDuplicate || product.variants.length === 0) {
      product.variants.push(variant);
    }
  }

  return {
    products: Array.from(productMap.values()),
    rawHeaders,
    totalRowsParsed: rows.length,
  };
}
