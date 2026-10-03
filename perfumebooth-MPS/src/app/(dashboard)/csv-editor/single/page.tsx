'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { FIELD_TO_CSV_HEADER } from '@/lib/csv/minimalCsvGenerator';
import { Sliders, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SingleFieldUpdatePage() {
  const router = useRouter();
  const { products, updateField, clearField, getChangesList } = useCSVEditorStore();

  const [selectedHandle, setSelectedHandle] = useState<string>(products[0]?.handle || '');
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('price');
  const [newValue, setNewValue] = useState<string>('');
  const [isCleared, setIsCleared] = useState<boolean>(false);
  const [previewActive, setPreviewActive] = useState<boolean>(false);

  const currentProduct = products.find((p) => p.handle === selectedHandle);
  const currentVariant = currentProduct?.variants.find(
    (v) => (selectedSku && v.sku === selectedSku) || v.productHandle === selectedHandle
  );

  // Get current value of selected field
  let currentValue = '';
  if (currentProduct) {
    if (selectedField in currentProduct) {
      currentValue = (currentProduct as any)[selectedField] || '';
    } else if (currentVariant && selectedField in currentVariant) {
      currentValue = (currentVariant as any)[selectedField] || '';
    }
  }

  const handleApplyChange = () => {
    if (!selectedHandle) return;
    if (isCleared) {
      clearField(selectedHandle, selectedSku || undefined, selectedField);
    } else {
      updateField(selectedHandle, selectedSku || undefined, selectedField, newValue);
    }
    setPreviewActive(true);
  };

  const csvHeaderName = FIELD_TO_CSV_HEADER[selectedField] || selectedField;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CSVEditorNav />

      <div className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Update One Field Wizard</h2>
            <p className="text-xs text-muted-foreground">
              Modify a single property safely. Unselected fields will be omitted from the exported update CSV.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground bg-secondary/30 rounded-xl border border-border">
            No products loaded. Please go to <strong className="text-primary cursor-pointer" onClick={() => router.push('/csv-editor/import')}>Import CSV</strong> to load products first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Inputs */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  1. Select Product
                </label>
                <select
                  value={selectedHandle}
                  onChange={(e) => {
                    setSelectedHandle(e.target.value);
                    setPreviewActive(false);
                  }}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.internalId} value={p.handle}>
                      {p.title || p.handle} ({p.handle})
                    </option>
                  ))}
                </select>
              </div>

              {currentProduct && currentProduct.variants.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    2. Select Variant (SKU)
                  </label>
                  <select
                    value={selectedSku}
                    onChange={(e) => {
                      setSelectedSku(e.target.value);
                      setPreviewActive(false);
                    }}
                    className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                  >
                    <option value="">All Variants</option>
                    {currentProduct.variants.map((v) => (
                      <option key={v.internalId} value={v.sku}>
                        {v.option1Value} — SKU: {v.sku || 'No SKU'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  3. Select Field to Edit
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setPreviewActive(false);
                  }}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                >
                  <optgroup label="Pricing & Inventory">
                    <option value="price">Variant Price</option>
                    <option value="compareAtPrice">Variant Compare At Price</option>
                    <option value="sku">Variant SKU</option>
                    <option value="barcode">Variant Barcode</option>
                    <option value="inventoryQty">Inventory Quantity</option>
                  </optgroup>
                  <optgroup label="Basic Information">
                    <option value="title">Product Title</option>
                    <option value="vendor">Vendor / Brand</option>
                    <option value="tags">Tags</option>
                    <option value="status">Status (active / draft / archived)</option>
                    <option value="productType">Product Type</option>
                  </optgroup>
                  <optgroup label="SEO Fields">
                    <option value="seoTitle">SEO Title</option>
                    <option value="seoDescription">SEO Description</option>
                  </optgroup>
                </select>
              </div>

              <div className="bg-secondary/40 p-3 rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground block mb-0.5">Current Value in Catalog:</span>
                <strong className="text-sm font-semibold text-foreground break-all">
                  {currentValue ? currentValue : <em className="text-muted-foreground font-normal">(Empty / Blank)</em>}
                </strong>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  4. Enter New Value
                </label>
                <input
                  type="text"
                  disabled={isCleared}
                  value={newValue}
                  onChange={(e) => {
                    setNewValue(e.target.value);
                    setPreviewActive(false);
                  }}
                  placeholder={`Enter new ${selectedField}...`}
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:ring-1 focus:ring-primary outline-hidden disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="clear-checkbox"
                  checked={isCleared}
                  onChange={(e) => {
                    setIsCleared(e.target.checked);
                    setPreviewActive(false);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="clear-checkbox" className="text-xs font-medium text-rose-600 cursor-pointer">
                  Intentionally clear this value (CLEARED state)
                </label>
              </div>

              {isCleared && (
                <div className="p-2.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] rounded-lg border border-rose-500/20 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Warning: Exporting a cleared field sends an empty value and clears it in the catalog.
                  </span>
                </div>
              )}

              <button
                onClick={handleApplyChange}
                className="w-full py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs mt-2"
              >
                Preview Change <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="bg-secondary/30 p-5 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Isolated Change Diff
                </h3>

                {previewActive ? (
                  <div className="flex flex-col gap-3">
                    <div className="p-3 bg-card rounded-lg border border-border text-xs">
                      <span className="text-muted-foreground block text-[11px]">Product:</span>
                      <strong className="text-foreground font-semibold">{currentProduct?.title || selectedHandle}</strong>
                      <span className="text-muted-foreground block text-[11px] mt-1">CSV Column:</span>
                      <strong className="text-primary font-mono text-[11px]">{csvHeaderName}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                        <span className="text-rose-600 text-[10px] uppercase font-bold block">OLD VALUE</span>
                        <strong className="text-foreground font-medium break-all">{currentValue || '(Blank)'}</strong>
                      </div>
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-600 text-[10px] uppercase font-bold block">NEW VALUE</span>
                        <strong className="text-foreground font-medium break-all">
                          {isCleared ? <em className="text-rose-600">(CLEARED)</em> : newValue || '(Blank)'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs border border-emerald-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All other catalog fields remain <strong>UNCHANGED</strong> and safe.</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-10 text-center">
                    Select field, enter new value, and click <strong>Preview Change</strong> to verify before exporting.
                  </div>
                )}
              </div>

              {previewActive && (
                <button
                  onClick={() => router.push('/csv-editor/review')}
                  className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
                >
                  Review & Export Update CSV <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
