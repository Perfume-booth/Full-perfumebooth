'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Layers,
  Check,
  Star,
  Eye,
  EyeOff,
  Package,
  Barcode,
  DollarSign,
  Boxes,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface VariantItem {
  id?: string;
  title: string;
  option1_name: string;
  option1_value: string;
  option2_name?: string;
  option2_value?: string;
  sku: string;
  barcode?: string;
  price: string;
  compare_at_price?: string;
  cost_price?: string;
  stock: number;
  weight?: string;
  dimensions?: string;
  is_default?: boolean;
  is_active?: boolean;
}

interface VariantManagerProps {
  baseSku: string;
  basePrice: string;
  baseComparePrice?: string;
  baseStock: number;
  initialVariants?: VariantItem[];
  onChange: (variants: VariantItem[]) => void;
}

export default function VariantManager({
  baseSku,
  basePrice,
  baseComparePrice = '',
  baseStock,
  initialVariants = [],
  onChange,
}: VariantManagerProps) {
  const [variants, setVariants] = useState<VariantItem[]>(initialVariants);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Quick Manual Bulk-Add Helper State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [manualOptionName, setManualOptionName] = useState('Size');
  const [manualOptionValues, setManualOptionValues] = useState('50ml, 100ml, 200ml');

  useEffect(() => {
    if (initialVariants && initialVariants.length > 0) {
      setVariants(initialVariants);
    }
  }, [initialVariants]);

  const cleanSkuPart = (val: string) => {
    return val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
  };

  // 111. Variant Management: Manual Add Row
  const handleAddManualVariant = () => {
    const baseCode = baseSku ? baseSku.trim() : 'SKU';
    const rowNum = variants.length + 1;
    const isFirst = variants.length === 0;

    const newVar: VariantItem = {
      title: `Variant ${rowNum}`,
      option1_name: 'Size',
      option1_value: `Option ${rowNum}`,
      option2_name: '',
      option2_value: '',
      sku: `${baseCode}-VAR${rowNum}`,
      barcode: '',
      price: basePrice || '999',
      compare_at_price: baseComparePrice || '',
      cost_price: '',
      stock: baseStock || 10,
      weight: '0.5 kg',
      dimensions: '10x12x15 cm',
      is_default: isFirst, // 120. Default Variant
      is_active: true,     // 119. Variant Status
    };

    const updated = [...variants, newVar];
    setVariants(updated);
    onChange(updated);
    setExpandedIndex(updated.length - 1);
  };

  // Quick Manual Bulk-Add from user's comma separated values
  const handleQuickAddVariants = () => {
    const vals = manualOptionValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (vals.length === 0) return;

    const baseCode = baseSku ? baseSku.trim() : 'SKU';
    const optName = manualOptionName.trim() || 'Option';

    const newRows: VariantItem[] = vals.map((val, idx) => {
      const isFirst = variants.length === 0 && idx === 0;
      const cleanVal = cleanSkuPart(val);
      return {
        title: val,
        option1_name: optName,
        option1_value: val,
        option2_name: '',
        option2_value: '',
        sku: `${baseCode}-${cleanVal}`,
        barcode: '',
        price: basePrice || '999',
        compare_at_price: baseComparePrice || '',
        cost_price: '',
        stock: baseStock || 10,
        weight: '0.5 kg',
        dimensions: '10x12x15 cm',
        is_default: isFirst,
        is_active: true,
      };
    });

    const updated = [...variants, ...newRows];
    setVariants(updated);
    onChange(updated);
    setShowQuickAdd(false);
  };

  // Update specific field on a variant
  const handleUpdateRow = (index: number, field: keyof VariantItem, value: any) => {
    const updated = variants.map((v, idx) => {
      if (idx === index) {
        const row = { ...v, [field]: value };
        // Sync display title automatically if option values change
        if (field === 'option1_value' || field === 'option2_value') {
          const o1 = field === 'option1_value' ? value : row.option1_value;
          const o2 = field === 'option2_value' ? value : row.option2_value;
          row.title = o2 ? `${o1} / ${o2}` : o1;
        }
        return row;
      }
      return v;
    });
    setVariants(updated);
    onChange(updated);
  };

  // 120. Default Variant Selector: Only 1 variant can be default
  const handleSetDefault = (index: number) => {
    const updated = variants.map((v, idx) => ({
      ...v,
      is_default: idx === index,
    }));
    setVariants(updated);
    onChange(updated);
  };

  // 119. Variant Status Toggle
  const handleToggleActive = (index: number) => {
    const updated = variants.map((v, idx) => {
      if (idx === index) {
        return { ...v, is_active: v.is_active === false };
      }
      return v;
    });
    setVariants(updated);
    onChange(updated);
  };

  const handleRemoveRow = (index: number) => {
    const wasDefault = variants[index]?.is_default;
    const updated = variants.filter((_, idx) => idx !== index);
    // If the deleted one was default, assign default to the first remaining variant
    if (wasDefault && updated.length > 0) {
      updated[0].is_default = true;
    }
    setVariants(updated);
    onChange(updated);
  };

  const handleClearAll = () => {
    if (confirm('Clear all variants and revert to single product mode?')) {
      setVariants([]);
      onChange([]);
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-card neu-extruded border border-border/10 p-6 sm:p-7 rounded-3xl">
      {/* Header with Title and Primary Manual Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neu-inset-sm flex items-center justify-center text-primary flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Product Variants</h3>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold text-primary neu-inset-sm">
                {variants.length > 0 ? `${variants.length} Variants Configured` : 'Single Product Mode'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {variants.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3.5 py-2 text-xs text-red-500 hover:text-red-400 neu-btn rounded-2xl transition cursor-pointer"
              title="Delete all variants to keep product as single SKU"
            >
              Clear All Variants
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="px-4 py-2 neu-btn text-foreground font-semibold rounded-2xl text-xs transition cursor-pointer"
          >
            {showQuickAdd ? 'Close Quick Add' : '⚡ Quick Multi-Add'}
          </button>
        </div>
      </div>

      {/* Optional Quick Multi-Value Manual Adder */}
      {showQuickAdd && (
        <div className="p-5 neu-inset rounded-2xl flex flex-col gap-3 border border-border/20 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Quick Multi-Row Variant Creator</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Quickly create multiple rows with custom attribute values
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Attribute Name</label>
              <input
                type="text"
                value={manualOptionName}
                onChange={(e) => setManualOptionName(e.target.value)}
                placeholder="e.g. Size, Scent, Volume"
                className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Option Values (comma separated)</label>
              <input
                type="text"
                value={manualOptionValues}
                onChange={(e) => setManualOptionValues(e.target.value)}
                placeholder="e.g. 50ml, 100ml, 200ml"
                className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleQuickAddVariants}
              className="flex items-center justify-center gap-2 px-4 py-2 neu-btn-primary font-semibold rounded-xl text-xs cursor-pointer h-[38px]"
            >
              <Check className="w-4 h-4" />
              <span>Add These Variants</span>
            </button>
          </div>
        </div>
      )}

      {/* Manual Variants Table Matrix */}
      {variants.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto neu-inset p-3 rounded-2xl border border-border/20">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="text-muted-foreground font-bold uppercase text-[10px] tracking-wider border-b border-border/40">
                <tr>
                  <th className="p-3 text-center w-12" title="Default Variant (120)">Default</th>
                  <th className="p-3">Attribute & Value (114)</th>
                  <th className="p-3">Variant SKU (112)</th>
                  <th className="p-3">Barcode (113)</th>
                  <th className="p-3">Price ₹ (115)</th>
                  <th className="p-3">Compare ₹ (124)</th>
                  <th className="p-3">Cost ₹ (116)</th>
                  <th className="p-3">Stock (118)</th>
                  <th className="p-3 text-center">Status (119)</th>
                  <th className="p-3 text-center">Logistics (122-123)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {variants.map((v, idx) => {
                  const isActive = v.is_active !== false;
                  const isDefault = Boolean(v.is_default);
                  const isExpanded = expandedIndex === idx;
                  const inStock = v.stock > 0;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        className={`transition hover:bg-primary/[0.04] ${
                          !isActive ? 'opacity-50' : ''
                        } ${isDefault ? 'bg-primary/5' : ''}`}
                      >
                        {/* 120. Default Variant Selector */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleSetDefault(idx)}
                            className={`p-1.5 rounded-xl transition cursor-pointer ${
                              isDefault
                                ? 'text-amber-400 neu-inset-sm'
                                : 'text-muted-foreground hover:text-foreground neu-btn'
                            }`}
                            title={isDefault ? 'Primary Default Variant' : 'Click to set as Default Variant'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-400' : ''}`} />
                          </button>
                        </td>

                        {/* 114. Variant Attributes (Option 1 Value & Name) */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={v.option1_value}
                              onChange={(e) => handleUpdateRow(idx, 'option1_value', e.target.value)}
                              placeholder="e.g. 100ml / Oud"
                              className="w-28 px-2 py-1 neu-input rounded-xl text-xs font-bold text-foreground"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] uppercase text-muted-foreground font-semibold">Attr:</span>
                              <input
                                type="text"
                                value={v.option1_name}
                                onChange={(e) => handleUpdateRow(idx, 'option1_name', e.target.value)}
                                placeholder="Size"
                                className="w-16 px-1.5 py-0.5 neu-input rounded-lg text-[10px] text-muted-foreground"
                              />
                            </div>
                          </div>
                        </td>

                        {/* 112. Variant SKU */}
                        <td className="p-3">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => handleUpdateRow(idx, 'sku', e.target.value)}
                            placeholder="SKU-XXX"
                            className="w-32 px-2 py-1 neu-input rounded-xl text-xs font-mono font-semibold text-foreground"
                          />
                        </td>

                        {/* 113. Variant Barcode */}
                        <td className="p-3">
                          <input
                            type="text"
                            value={v.barcode || ''}
                            onChange={(e) => handleUpdateRow(idx, 'barcode', e.target.value)}
                            placeholder="EAN / Barcode"
                            className="w-28 px-2 py-1 neu-input rounded-xl text-xs font-mono text-foreground"
                          />
                        </td>

                        {/* 115. Variant Price */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleUpdateRow(idx, 'price', e.target.value)}
                            className="w-20 px-2 py-1 neu-input rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                          />
                        </td>

                        {/* 124. Variant Compare Price (MRP) */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={v.compare_at_price || ''}
                            onChange={(e) => handleUpdateRow(idx, 'compare_at_price', e.target.value)}
                            placeholder="MRP"
                            className="w-20 px-2 py-1 neu-input rounded-xl text-xs text-muted-foreground"
                          />
                        </td>

                        {/* 116. Variant Cost */}
                        <td className="p-3">
                          <input
                            type="number"
                            value={v.cost_price || ''}
                            onChange={(e) => handleUpdateRow(idx, 'cost_price', e.target.value)}
                            placeholder="Cost"
                            className="w-20 px-2 py-1 neu-input rounded-xl text-xs text-amber-500 font-medium"
                          />
                        </td>

                        {/* 118. Variant Stock & 117. Availability */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              value={v.stock}
                              onChange={(e) => handleUpdateRow(idx, 'stock', parseInt(e.target.value, 10) || 0)}
                              className="w-16 px-2 py-1 neu-input rounded-xl text-xs font-bold text-foreground"
                            />
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-center neu-inset-sm ${
                                inStock
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-500'
                              }`}
                            >
                              {inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </td>

                        {/* 119. Variant Status Toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(idx)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer neu-btn ${
                              isActive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                            }`}
                            title={isActive ? 'Active and purchasable' : 'Hidden from storefront'}
                          >
                            {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{isActive ? 'Active' : 'Hidden'}</span>
                          </button>
                        </td>

                        {/* 122. Dimensions & 123. Weight Expand Toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer neu-btn ${
                              isExpanded
                                ? 'text-primary neu-inset-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Expand weight, dimensions & secondary option"
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>{v.weight || 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Action: Delete */}
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="w-8 h-8 text-red-500 hover:text-red-400 rounded-xl neu-btn inline-flex items-center justify-center transition cursor-pointer"
                            title="Delete this variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Panel for 122. Dimensions, 123. Weight, and Option 2 */}
                      {isExpanded && (
                        <tr className="border-b border-border/20">
                          <td colSpan={11} className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card neu-extruded-sm border border-border/20 rounded-2xl p-4">
                              {/* 123. Variant Weight */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Variant Weight (123)
                                </label>
                                <input
                                  type="text"
                                  value={v.weight || ''}
                                  onChange={(e) => handleUpdateRow(idx, 'weight', e.target.value)}
                                  placeholder="e.g. 0.35 kg or 350g"
                                  className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
                                />
                              </div>

                              {/* 122. Variant Dimensions */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Variant Dimensions L×W×H (122)
                                </label>
                                <input
                                  type="text"
                                  value={v.dimensions || ''}
                                  onChange={(e) => handleUpdateRow(idx, 'dimensions', e.target.value)}
                                  placeholder="e.g. 10x12x15 cm"
                                  className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
                                />
                              </div>

                              {/* Secondary Attribute Option 2 (114) */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Secondary Option Name (114)
                                </label>
                                <input
                                  type="text"
                                  value={v.option2_name || ''}
                                  onChange={(e) => handleUpdateRow(idx, 'option2_name', e.target.value)}
                                  placeholder="e.g. Concentration"
                                  className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
                                />
                              </div>

                              {/* Secondary Attribute Value (114) */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                  Secondary Option Value (114)
                                </label>
                                <input
                                  type="text"
                                  value={v.option2_value || ''}
                                  onChange={(e) => handleUpdateRow(idx, 'option2_value', e.target.value)}
                                  placeholder="e.g. EDP, Extrait, Oil"
                                  className="px-3 py-2 neu-input rounded-xl text-xs font-semibold text-foreground"
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
            <span>
              ⭐ <b>Default Variant:</b> Used as primary selection for product landing page and cart.
            </span>
            <button
              type="button"
              onClick={handleAddManualVariant}
              className="text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another variant row</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted-foreground neu-inset rounded-2xl flex flex-col items-center gap-3 border border-border/20">
          <div className="w-12 h-12 rounded-2xl neu-extruded-sm flex items-center justify-center text-primary">
            <Boxes className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-foreground text-sm">
            Single Product Mode Active
          </span>
          <span className="max-w-md text-xs text-muted-foreground">
            This product has no variants. It uses parent price (₹{basePrice || '999'}), stock ({baseStock || 0}), and SKU ({baseSku || 'SKU'}).
          </span>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={handleAddManualVariant}
              className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-semibold rounded-2xl text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add First Variant Manually</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="px-4 py-2.5 neu-btn text-foreground font-semibold rounded-2xl text-xs cursor-pointer"
            >
              ⚡ Quick Multi-Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
