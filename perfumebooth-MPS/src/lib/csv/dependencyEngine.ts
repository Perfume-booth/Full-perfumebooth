/**
 * Dependency Engine
 * Determines required contextual headers/columns for any edited field.
 */

export interface FieldDependencyMap {
  field: string;
  requiredIdentifiers: string[];
  description: string;
}

export const DEPENDENCY_RULES: Record<string, string[]> = {
  price: ['Handle', 'Option1 Name', 'Option1 Value'],
  compareAtPrice: ['Handle', 'Option1 Name', 'Option1 Value'],
  sku: ['Handle', 'Option1 Name', 'Option1 Value'],
  barcode: ['Handle', 'Option1 Name', 'Option1 Value'],
  inventoryQty: ['Handle', 'Option1 Name', 'Option1 Value'],
  option1Value: ['Handle', 'Option1 Name'],
  option2Value: ['Handle', 'Option1 Name', 'Option1 Value', 'Option2 Name'],
  option3Value: ['Handle', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name'],
  title: ['Handle'],
  bodyHtml: ['Handle'],
  vendor: ['Handle'],
  tags: ['Handle'],
  status: ['Handle'],
  seoTitle: ['Handle'],
  seoDescription: ['Handle'],
  imageSrc: ['Handle'],
};

export function getRequiredHeadersForFields(editedFields: Set<string>): Set<string> {
  const headers = new Set<string>(['Handle']); // Handle is always mandatory

  editedFields.forEach((field) => {
    const deps = DEPENDENCY_RULES[field];
    if (deps) {
      deps.forEach((d) => headers.add(d));
    }
  });

  return headers;
}
