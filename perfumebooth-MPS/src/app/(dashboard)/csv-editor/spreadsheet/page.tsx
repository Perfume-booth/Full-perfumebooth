'use client';

import React, { useState } from 'react';
import CSVEditorNav from '@/components/csv/CSVEditorNav';
import { useCSVEditorStore } from '@/lib/csv/changeSetStore';
import { CatalogProduct, CatalogVariant } from '@/lib/csv/types';
import { Table as TableIcon, Search, Undo2, Redo2, RotateCcw, AlertCircle } from 'lucide-react';

export default function SpreadsheetEditorPage() {
  const { products, changeSet, updateField, resetAllChanges } = useCSVEditorStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products by search
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.handle.toLowerCase().includes(term) ||
      p.vendor.toLowerCase().includes(term) ||
      p.variants.some((v) => v.sku?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <CSVEditorNav />

      <div className="bg-card neu-extruded rounded-3xl border-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-border/50 flex flex-wrap justify-between items-center gap-4 bg-secondary/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-card neu-inset-sm rounded-2xl text-primary">
              <TableIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">Excel Data Grid Editor</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Edit cells directly. Colors highlight changes: <span className="text-emerald-600 font-bold">Green = Edited</span>, <span className="text-amber-600 font-bold">Yellow = Warning</span>, <span className="text-muted-foreground font-bold">Gray = Untouched</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products or SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 text-xs neu-input rounded-2xl text-foreground font-medium w-72"
              />
            </div>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto text-xs">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-secondary/40 sticky top-0 border-b border-border/50 z-10 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3.5 border-r border-border/50 min-w-[150px]">Handle</th>
                <th className="p-3.5 border-r border-border/50 min-w-[200px]">Product Title</th>
                <th className="p-3.5 border-r border-border/50 min-w-[120px]">SKU</th>
                <th className="p-3.5 border-r border-border/50 min-w-[120px]">Option1 Value</th>
                <th className="p-3.5 border-r border-border/50 min-w-[110px]">Price (₹)</th>
                <th className="p-3.5 border-r border-border/50 min-w-[110px]">Compare Price</th>
                <th className="p-3.5 border-r border-border/50 min-w-[90px]">Stock</th>
                <th className="p-3.5 border-r border-border/50 min-w-[140px]">Vendor</th>
                <th className="p-3.5 border-r border-border/50 min-w-[150px]">Tags</th>
                <th className="p-3.5 min-w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
                    No matching products found in loaded dataset.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) =>
                  product.variants.map((variant, vIdx) => {
                    const rowKey = `${product.handle}:${variant.sku || 'default'}`;

                    // Helper to get change status color
                    const getCellStyle = (field: string) => {
                      const key = `${product.handle}:${variant.sku || 'ALL'}:${field}`;
                      const change = changeSet.get(key);
                      if (!change) return 'bg-background text-foreground';
                      if (change.state === 'CLEARED') return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold border-l-2 border-rose-500';
                      return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold border-l-2 border-emerald-500';
                    };

                    return (
                      <tr key={`${rowKey}-${vIdx}`} className="hover:bg-secondary/30 transition-colors">
                        {/* Handle */}
                        <td className={`p-2 border-r border-border font-mono text-[11px] ${getCellStyle('handle')}`}>
                          <input
                            type="text"
                            value={product.handle}
                            onChange={(e) => updateField(product.handle, variant.sku, 'handle', e.target.value)}
                            className="w-full bg-transparent outline-hidden font-mono"
                          />
                        </td>

                        {/* Title */}
                        <td className={`p-2 border-r border-border ${getCellStyle('title')}`}>
                          <input
                            type="text"
                            value={product.title}
                            onChange={(e) => updateField(product.handle, variant.sku, 'title', e.target.value)}
                            className="w-full bg-transparent outline-hidden font-medium"
                          />
                        </td>

                        {/* SKU */}
                        <td className={`p-2 border-r border-border font-mono ${getCellStyle('sku')}`}>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateField(product.handle, variant.sku, 'sku', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Option1 Value */}
                        <td className={`p-2 border-r border-border ${getCellStyle('option1Value')}`}>
                          <input
                            type="text"
                            value={variant.option1Value}
                            onChange={(e) => updateField(product.handle, variant.sku, 'option1Value', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Price */}
                        <td className={`p-2 border-r border-border font-semibold ${getCellStyle('price')}`}>
                          <input
                            type="text"
                            value={variant.price}
                            onChange={(e) => updateField(product.handle, variant.sku, 'price', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Compare At Price */}
                        <td className={`p-2 border-r border-border ${getCellStyle('compareAtPrice')}`}>
                          <input
                            type="text"
                            value={variant.compareAtPrice || ''}
                            onChange={(e) => updateField(product.handle, variant.sku, 'compareAtPrice', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Stock Level */}
                        <td className={`p-2 border-r border-border ${getCellStyle('inventoryQty')}`}>
                          <input
                            type="text"
                            value={variant.inventoryQty || ''}
                            onChange={(e) => updateField(product.handle, variant.sku, 'inventoryQty', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Vendor */}
                        <td className={`p-2 border-r border-border ${getCellStyle('vendor')}`}>
                          <input
                            type="text"
                            value={product.vendor}
                            onChange={(e) => updateField(product.handle, variant.sku, 'vendor', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Tags */}
                        <td className={`p-2 border-r border-border ${getCellStyle('tags')}`}>
                          <input
                            type="text"
                            value={product.tags}
                            onChange={(e) => updateField(product.handle, variant.sku, 'tags', e.target.value)}
                            className="w-full bg-transparent outline-hidden"
                          />
                        </td>

                        {/* Status */}
                        <td className={`p-2 ${getCellStyle('status')}`}>
                          <select
                            value={product.status || 'active'}
                            onChange={(e) => updateField(product.handle, variant.sku, 'status', e.target.value)}
                            className="w-full bg-transparent outline-hidden text-xs cursor-pointer"
                          >
                            <option value="active">active</option>
                            <option value="draft">draft</option>
                            <option value="archived">archived</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
