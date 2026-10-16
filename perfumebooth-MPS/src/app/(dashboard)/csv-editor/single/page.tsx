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

      <div className="bg-card neu-extruded p-6 sm:p-8 rounded-3xl border-0 flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-border/50 pb-4">
          <div className="p-3 bg-card neu-inset-sm rounded-2xl text-primary">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground tracking-tight">Update One Field Wizard</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Modify a single property safely. Unselected fields will be omitted from the exported update CSV.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground neu-inset rounded-2xl font-semibold">
            No products loaded. Please go to <strong className="text-primary cursor-pointer hover:underline" onClick={() => router.push('/csv-editor/import')}>Import CSV</strong> to load products first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form Inputs */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  1. Select Product
                </label>
                <select
                  value={selectedHandle}
                  onChange={(e) => {
                    setSelectedHandle(e.target.value);
                    setPreviewActive(false);
                  }}
                  className="w-full text-xs py-3 px-3.5 neu-input rounded-2xl text-foreground font-semibold cursor-pointer"
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
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    2. Select Variant (SKU)
                  </label>
                  <select
                    value={selectedSku}
                    onChange={(e) => {
                      setSelectedSku(e.target.value);
                      setPreviewActive(false);
                    }}
                    className="w-full text-xs py-3 px-3.5 neu-input rounded-2xl text-foreground font-semibold cursor-pointer"
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  3. Select Field to Edit
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setPreviewActive(false);
                  }}
                  className="w-full text-xs py-3 px-3.5 neu-input rounded-2xl text-foreground font-semibold cursor-pointer"
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

              <div className="neu-inset-sm p-4 rounded-2xl">
                <span className="text-[11px] text-muted-foreground font-medium block mb-1">Current Value in Catalog:</span>
                <strong className="text-sm font-extrabold text-foreground break-all">
                  {currentValue ? currentValue : <em className="text-muted-foreground font-normal">(Empty / Blank)</em>}
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
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
                  className="w-full text-xs py-3 px-3.5 neu-input rounded-2xl text-foreground font-medium disabled:opacity-50"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="clear-checkbox"
                  checked={isCleared}
                  onChange={(e) => {
                    setIsCleared(e.target.checked);
                    setPreviewActive(false);
                  }}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="clear-checkbox" className="text-xs font-bold text-rose-500 cursor-pointer">
                  Intentionally clear this value (CLEARED state)
                </label>
              </div>

              {isCleared && (
                <div className="p-3 neu-inset-sm text-rose-600 dark:text-rose-400 text-xs rounded-2xl flex gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Warning: Exporting a cleared field sends an empty value and clears it in the catalog.
                  </span>
                </div>
              )}

              <button
                onClick={handleApplyChange}
                className="w-full py-3 neu-btn-primary text-xs font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                Preview Change <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="neu-inset p-6 rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Isolated Change Diff
                </h3>

                {previewActive ? (
                  <div className="flex flex-col gap-3.5">
                    <div className="p-4 bg-card neu-extruded-sm rounded-2xl text-xs">
                      <span className="text-muted-foreground block text-[11px] font-medium">Product:</span>
                      <strong className="text-foreground font-bold">{currentProduct?.title || selectedHandle}</strong>
                      <span className="text-muted-foreground block text-[11px] mt-1.5 font-medium">CSV Column:</span>
                      <strong className="text-primary font-mono text-xs">{csvHeaderName}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="neu-inset-sm p-3.5 rounded-2xl">
                        <span className="text-rose-600 text-[10px] uppercase font-bold block mb-1">OLD VALUE</span>
                        <strong className="text-foreground font-semibold break-all">{currentValue || '(Blank)'}</strong>
                      </div>
                      <div className="neu-inset-sm p-3.5 rounded-2xl">
                        <span className="text-emerald-600 text-[10px] uppercase font-bold block mb-1">NEW VALUE</span>
                        <strong className="text-foreground font-semibold break-all">
                          {isCleared ? <em className="text-rose-600 font-bold">(CLEARED)</em> : newValue || '(Blank)'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-3.5 neu-inset-sm text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All other catalog fields remain <strong>UNCHANGED</strong> and safe.</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-16 text-center font-medium">
                    Select field, enter new value, and click <strong>Preview Change</strong> to verify before exporting.
                  </div>
                )}
              </div>

              {previewActive && (
                <button
                  onClick={() => router.push('/csv-editor/review')}
                  className="w-full py-3 neu-btn-primary text-xs font-bold rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 mt-4"
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
