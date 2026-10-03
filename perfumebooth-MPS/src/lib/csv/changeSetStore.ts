import { create } from 'zustand';
import {
  CatalogProduct,
  CatalogVariant,
  FieldChange,
  FieldState,
  ValidationIssue,
  SystemStats,
} from './types';

interface CSVEditorState {
  rawHeaders: string[];
  products: CatalogProduct[];
  originalProducts: CatalogProduct[];
  changeSet: Map<string, FieldChange>; // Key: "handle:sku:field"
  history: Map<string, FieldChange>[];
  historyIndex: number;

  // Selected scope for "Update One Field" wizard or bulk editing
  selectedHandles: Set<string>;
  selectedField: string | null;
  activeMode: 'SAFE_UPDATE' | 'FULL_CATALOG';

  // Actions
  setImportedData: (products: CatalogProduct[], rawHeaders: string[]) => void;
  updateField: (
    productHandle: string,
    variantSku: string | undefined,
    field: string,
    newValue: any,
    state?: FieldState
  ) => void;
  bulkUpdateField: (
    handles: string[],
    field: string,
    valueOrUpdater: any | ((oldVal: any) => any),
    actionType?: 'SET' | 'PERCENT_PRICE' | 'ADD_TAG' | 'REMOVE_TAG' | 'REPLACE_TAG' | 'REPLACE_TEXT'
  ) => void;
  clearField: (productHandle: string, variantSku: string | undefined, field: string) => void;
  resetField: (productHandle: string, variantSku: string | undefined, field: string) => void;
  resetAllChanges: () => void;
  setSelectedHandles: (handles: Set<string>) => void;
  setSelectedField: (field: string | null) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;

  // Derived Calculations
  getStats: () => SystemStats;
  getChangesList: () => FieldChange[];
}

export const useCSVEditorStore = create<CSVEditorState>((set, get) => ({
  rawHeaders: [],
  products: [],
  originalProducts: [],
  changeSet: new Map(),
  history: [new Map()],
  historyIndex: 0,

  selectedHandles: new Set(),
  selectedField: null,
  activeMode: 'SAFE_UPDATE',

  setImportedData: (products, rawHeaders) => {
    // Deep clone original data
    const originalCloned = JSON.parse(JSON.stringify(products));
    set({
      products,
      originalProducts: originalCloned,
      rawHeaders,
      changeSet: new Map(),
      history: [new Map()],
      historyIndex: 0,
      selectedHandles: new Set(products.map((p) => p.handle)),
    });
  },

  updateField: (productHandle, variantSku, field, newValue, state = 'UPDATED') => {
    const { products, originalProducts, changeSet } = get();

    // Find original product & variant
    const origProd = originalProducts.find((p) => p.handle === productHandle);
    let origValue: any = '';

    if (origProd) {
      if (field in origProd) {
        origValue = (origProd as any)[field];
      } else {
        const origVar = origProd.variants.find(
          (v) => (variantSku && v.sku === variantSku) || v.productHandle === productHandle
        );
        if (origVar && field in origVar) {
          origValue = (origVar as any)[field];
        }
      }
    }

    const key = `${productHandle}:${variantSku || 'ALL'}:${field}`;
    const newChangeSet = new Map(changeSet);

    // If new value equals original value, mark as UNTOUCHED / remove from changeSet
    if (String(newValue).trim() === String(origValue).trim() && state !== 'CLEARED') {
      newChangeSet.delete(key);
    } else {
      const change: FieldChange = {
        id: key,
        productHandle,
        variantSku,
        field,
        oldValue: origValue,
        newValue,
        state: state === 'CLEARED' ? 'CLEARED' : newValue === '' ? 'CLEARED' : 'UPDATED',
        timestamp: Date.now(),
      };
      newChangeSet.set(key, change);
    }

    // Mutate internal products state
    const updatedProducts = products.map((p) => {
      if (p.handle !== productHandle) return p;
      const copyP = { ...p };

      if (field in copyP) {
        (copyP as any)[field] = newValue;
      } else {
        copyP.variants = copyP.variants.map((v) => {
          if (variantSku && v.sku !== variantSku) return v;
          return { ...v, [field]: newValue };
        });
      }
      return copyP;
    });

    set({
      products: updatedProducts,
      changeSet: newChangeSet,
    });
  },

  bulkUpdateField: (handles, field, valueOrUpdater, actionType = 'SET') => {
    const { products } = get();

    handles.forEach((handle) => {
      const prod = products.find((p) => p.handle === handle);
      if (!prod) return;

      if (field === 'price' || field === 'compareAtPrice') {
        prod.variants.forEach((variant) => {
          const currentVal = parseFloat(String((variant as any)[field] || '0')) || 0;
          let calculatedVal = currentVal;

          if (actionType === 'PERCENT_PRICE') {
            const pct = parseFloat(valueOrUpdater) || 0;
            calculatedVal = currentVal * (1 + pct / 100);
          } else if (typeof valueOrUpdater === 'function') {
            calculatedVal = valueOrUpdater(currentVal);
          } else {
            calculatedVal = parseFloat(valueOrUpdater) || 0;
          }

          get().updateField(handle, variant.sku, field, calculatedVal.toFixed(2));
        });
      } else if (field === 'tags') {
        let currentTags = prod.tags
          ? prod.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [];

        if (actionType === 'ADD_TAG') {
          if (!currentTags.includes(valueOrUpdater)) currentTags.push(valueOrUpdater);
        } else if (actionType === 'REMOVE_TAG') {
          currentTags = currentTags.filter((t) => t !== valueOrUpdater);
        } else if (actionType === 'REPLACE_TAG') {
          const [oldTag, newTag] = valueOrUpdater.split(':');
          currentTags = currentTags.map((t) => (t === oldTag ? newTag : t));
        }

        get().updateField(handle, undefined, 'tags', currentTags.join(', '));
      } else {
        // Simple set or update for product or variant field
        get().updateField(handle, undefined, field, valueOrUpdater);
      }
    });
  },

  clearField: (productHandle, variantSku, field) => {
    get().updateField(productHandle, variantSku, field, '', 'CLEARED');
  },

  resetField: (productHandle, variantSku, field) => {
    const { originalProducts } = get();
    const origProd = originalProducts.find((p) => p.handle === productHandle);
    if (!origProd) return;

    let origVal = '';
    if (field in origProd) {
      origVal = (origProd as any)[field];
    } else {
      const origVar = origProd.variants.find(
        (v) => (variantSku && v.sku === variantSku) || v.productHandle === productHandle
      );
      if (origVar) origVal = (origVar as any)[field];
    }
    get().updateField(productHandle, variantSku, field, origVal, 'UNTOUCHED');
  },

  resetAllChanges: () => {
    const { originalProducts } = get();
    set({
      products: JSON.parse(JSON.stringify(originalProducts)),
      changeSet: new Map(),
    });
  },

  setSelectedHandles: (selectedHandles) => set({ selectedHandles }),
  setSelectedField: (selectedField) => set({ selectedField }),

  undo: () => {},
  redo: () => {},

  getStats: () => {
    const { products, changeSet } = get();
    const changes = Array.from(changeSet.values());

    const changedHandles = new Set(changes.map((c) => c.productHandle));

    let totalVariants = 0;
    products.forEach((p) => {
      totalVariants += p.variants.length;
    });

    const warningsCount = changes.filter(
      (c) =>
        c.state === 'CLEARED' ||
        c.field === 'handle' ||
        c.field === 'sku' ||
        c.field.startsWith('option')
    ).length;

    return {
      totalProducts: products.length,
      totalVariants,
      changedProductsCount: changedHandles.size,
      changedFieldsCount: changes.length,
      warningsCount,
      errorsCount: 0,
    };
  },

  getChangesList: () => {
    return Array.from(get().changeSet.values());
  },
}));
