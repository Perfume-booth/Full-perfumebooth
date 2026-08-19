'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, Check } from 'lucide-react';

export interface VariantItem {
  id?: string;
  title: string;
  option1_name: string;
  option1_value: string;
  option2_name?: string;
  option2_value?: string;
  sku: string;
  price: string;
  compare_at_price?: string;
  stock: number;
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
  const [optionName, setOptionName] = useState('Size');
  const [optionValuesStr, setOptionValuesStr] = useState('50ml, 100ml, 200ml');
  const [variants, setVariants] = useState<VariantItem[]>(initialVariants);

  useEffect(() => {
    if (initialVariants && initialVariants.length > 0) {
      setVariants(initialVariants);
    }
  }, [initialVariants]);

  const handleGenerateVariants = () => {
    const values = optionValuesStr
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) return;

    const generated: VariantItem[] = values.map((val, idx) => {
      const cleanVal = val.toUpperCase().replace(/\s+/g, '');
      return {
        title: `${val}`,
        option1_name: optionName,
        option1_value: val,
        sku: baseSku ? `${baseSku}-${cleanVal}` : `SKU-${cleanVal}`,
        price: basePrice || '999',
        compare_at_price: baseComparePrice || '',
        stock: baseStock || 10,
      };
    });

    setVariants(generated);
    onChange(generated);
  };

  const handleAddCustomRow = () => {
    const newVar: VariantItem = {
      title: '100ml',
      option1_name: optionName,
      option1_value: '100ml',
      sku: baseSku ? `${baseSku}-VAR${variants.length + 1}` : `SKU-VAR${variants.length + 1}`,
      price: basePrice || '999',
      compare_at_price: baseComparePrice || '',
      stock: baseStock || 10,
    };
    const updated = [...variants, newVar];
    setVariants(updated);
    onChange(updated);
  };

  const handleUpdateRow = (index: number, field: keyof VariantItem, value: any) => {
    const updated = variants.map((v, idx) => {
      if (idx === index) {
        const row = { ...v, [field]: value };
        if (field === 'option1_value') {
          row.title = value;
        }
        return row;
      }
      return v;
    });
    setVariants(updated);
    onChange(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = variants.filter((_, idx) => idx !== index);
    setVariants(updated);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-5 bg-[#0f1117] border border-border p-6 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Shopify Product Variants (Sizes & Volume)</h3>
            <p className="text-xs text-muted-foreground">
              Add multiple bottle sizes (e.g. 50ml, 100ml, Scent Shot) under 1 single product page
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddCustomRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground font-semibold rounded-xl text-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Variant Row</span>
        </button>
      </div>

      {/* Quick Generator Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-secondary/20 border border-border/70 rounded-xl items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Option Name</label>
          <input
            type="text"
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
            placeholder="e.g. Size or Volume"
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Option Values (comma separated)</label>
          <input
            type="text"
            value={optionValuesStr}
            onChange={(e) => setOptionValuesStr(e.target.value)}
            placeholder="e.g. 50ml, 100ml, 200ml"
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerateVariants}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:shadow-lg transition cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Generate Variant Rows</span>
        </button>
      </div>

      {/* Variants Table Matrix */}
      {variants.length > 0 ? (
        <div className="overflow-x-auto border border-border/70 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border/70">
              <tr>
                <th className="p-3">Variant Size</th>
                <th className="p-3">Variant SKU</th>
                <th className="p-3">Price (₹)</th>
                <th className="p-3">Compare Price (₹)</th>
                <th className="p-3">Stock Level</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {variants.map((v, idx) => (
                <tr key={idx} className="hover:bg-muted/10 transition">
                  <td className="p-3 font-semibold text-foreground">
                    <input
                      type="text"
                      value={v.option1_value}
                      onChange={(e) => handleUpdateRow(idx, 'option1_value', e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => handleUpdateRow(idx, 'sku', e.target.value)}
                      className="w-36 px-2 py-1 bg-background border border-border rounded text-xs font-semibold text-foreground focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) => handleUpdateRow(idx, 'price', e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-xs font-bold text-emerald-400 focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={v.compare_at_price || ''}
                      onChange={(e) => handleUpdateRow(idx, 'compare_at_price', e.target.value)}
                      className="w-24 px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => handleUpdateRow(idx, 'stock', parseInt(e.target.value, 10) || 0)}
                      className="w-20 px-2 py-1 bg-background border border-border rounded text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg border border-border hover:border-red-500/20 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-muted-foreground bg-secondary/10 border border-dashed border-border rounded-xl">
          No custom size variants generated yet. Single product mode active.
        </div>
      )}
    </div>
  );
}
