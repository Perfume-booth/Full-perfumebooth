export type FieldState = 'UNTOUCHED' | 'UPDATED' | 'CLEARED';

export interface FieldChange {
  id: string; // e.g. "blue-shirt:BS001:price"
  productHandle: string;
  variantSku?: string;
  field: keyof ShopifyVariant | keyof ShopifyProduct | string;
  oldValue: any;
  newValue: any;
  state: FieldState;
  timestamp: number;
}

export interface ShopifyVariant {
  internalId: string;
  productHandle: string;
  sku: string;
  barcode: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  inventoryQty: string;
  inventoryTracker: string;
  inventoryPolicy: string;
  fulfillmentService: string;
  requiresShipping: string;
  taxable: string;
  weight: string;
  weightUnit: string;
  option1Name: string;
  option1Value: string;
  option2Name: string;
  option2Value: string;
  option3Name: string;
  option3Value: string;
  imageSrc: string;
  // Raw fields fallback
  rawRow: Record<string, string>;
}

export interface ShopifyProduct {
  internalId: string;
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  productCategory: string;
  productType: string;
  tags: string;
  published: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  variants: ShopifyVariant[];
  images: { src: string; position: string; altText: string }[];
  // Raw first row fallback for reference
  rawRow: Record<string, string>;
}

export interface ValidationIssue {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  handle: string;
  sku?: string;
  field: string;
  message: string;
  suggestedFix?: string;
}

export interface SystemStats {
  totalProducts: number;
  totalVariants: number;
  changedProductsCount: number;
  changedFieldsCount: number;
  warningsCount: number;
  errorsCount: number;
}
