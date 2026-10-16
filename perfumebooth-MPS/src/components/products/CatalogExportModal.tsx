'use client';

import React, { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  barcode?: string;
  price: string;
  compare_at_price: string | null;
  image: string | null;
  stock: number;
  is_online: boolean;
  attributes: Record<string, any>;
}

interface CatalogExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedSlugs: string[];
}

export default function CatalogExportModal({
  isOpen,
  onClose,
  products,
  selectedSlugs,
}: CatalogExportModalProps) {
  const [exportScope, setExportScope] = useState<'all' | 'current' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);

    let targetProducts = products;
    if (exportScope === 'selected' && selectedSlugs.length > 0) {
      targetProducts = products.filter((p) => selectedSlugs.includes(p.slug));
    }

    const rows = targetProducts.map((p) => {
      const attrs = p.attributes || {};
      const tagsStr = Array.isArray(attrs.tags) ? attrs.tags.join(', ') : (attrs.tags || '');

      return {
        'Handle': p.slug,
        'Title': p.title,
        'Body (HTML)': attrs.description || p.title,
        'Vendor': attrs.brand || attrs.vendor || 'PerfumeBooth',
        'Product Category': attrs.category || 'Perfume',
        'Type': attrs.productType || 'Eau de Parfum',
        'Tags': tagsStr,
        'Published': p.is_online ? 'true' : 'false',
        'Option1 Name': 'Title',
        'Option1 Value': 'Default Title',
        'Option2 Name': '',
        'Option2 Value': '',
        'Option3 Name': '',
        'Option3 Value': '',
        'Variant SKU': p.sku,
        'Variant Grams': '350',
        'Variant Inventory Tracker': 'catalog',
        'Variant Inventory Qty': String(p.stock || 0),
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': p.price,
        'Variant Compare At Price': p.compare_at_price || '',
        'Variant Requires Shipping': 'true',
        'Variant Taxable': 'true',
        'Variant Barcode': p.barcode || attrs.barcode || '',
        'Image Src': p.image || '',
        'Image Position': '1',
        'Image Alt Text': attrs.image_alt_text || p.title,
        'Gift Card': 'false',
        'SEO Title': attrs.meta_title || p.title,
        'SEO Description': attrs.meta_description || '',
        'Google Shopping / Gender': attrs.gender || 'Unisex',
        'Status': p.is_online ? 'active' : 'draft',
      };
    });

    const csvContent = Papa.unparse(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `catalog_products_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Export products</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Export Scope
            </span>

            <label className="flex items-center gap-3 p-3.5 bg-secondary/30 border border-border rounded-xl cursor-pointer hover:border-primary/50 transition">
              <input
                type="radio"
                name="scope"
                checked={exportScope === 'all'}
                onChange={() => setExportScope('all')}
                className="w-4 h-4 text-primary border-border focus:ring-primary"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">All products</span>
                <span className="text-xs text-muted-foreground">
                  Export all {products.length} products in your catalog
                </span>
              </div>
            </label>

            {selectedSlugs.length > 0 && (
              <label className="flex items-center gap-3 p-3.5 bg-secondary/30 border border-border rounded-xl cursor-pointer hover:border-primary/50 transition">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'selected'}
                  onChange={() => setExportScope('selected')}
                  className="w-4 h-4 text-primary border-border focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    Selected products ({selectedSlugs.length})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Export only the products you selected in the table
                  </span>
                </div>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Export Format
            </span>
            <div className="p-3.5 bg-secondary/40 border border-border rounded-xl text-xs text-foreground font-medium">
              CSV file for Excel, Numbers, or other spreadsheet programs
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border text-foreground font-semibold rounded-xl hover:bg-secondary text-sm transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg transition text-sm cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export products</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
