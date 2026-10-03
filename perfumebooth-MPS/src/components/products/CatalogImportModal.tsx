'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { parseCatalogCsv } from '@/lib/csv/csvParser';
import { apiFetch } from '@/lib/api';

interface CatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CatalogImportModal({ isOpen, onClose, onSuccess }: CatalogImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setImportSummary(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setImportSummary(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a CSV file to import.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Send FormData directly to Django backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', overwrite ? 'true' : 'false');

      const response = await apiFetch('/shop/products/excel-import/', {
        method: 'POST',
        body: formData,
      });

      setImportSummary(response.detail || `Successfully imported products from ${file.name}`);
      onSuccess();
    } catch (err: any) {
      // Client-side parse fallback if backend endpoint expects client payload
      try {
        const text = await file.text();
        const parsed = parseCatalogCsv(text);

        if (parsed.products.length === 0) {
          throw new Error('No valid products found in CSV file.');
        }

        let updatedCount = 0;
        for (const p of parsed.products) {
          const mainVariant = p.variants[0] || {};
          const productPayload = {
            title: p.title || p.handle,
            slug: p.handle,
            sku: mainVariant.sku || `${p.handle}-SKU`,
            price: mainVariant.price || '0.00',
            compare_at_price: mainVariant.compareAtPrice || null,
            description: p.bodyHtml || '',
            stock_level: parseInt(mainVariant.inventoryQty || '0', 10),
            is_online: p.status === 'active' || p.published === 'true' || p.published === '1',
            attributes: JSON.stringify({
              brand: p.vendor || 'PerfumeBooth',
              vendor: p.vendor || '',
              category: p.productCategory || 'Perfume',
              productType: p.productType || 'Eau de Parfum',
              tags: p.tags ? p.tags.split(',').map((t) => t.trim()) : [],
              meta_title: p.seoTitle || '',
              meta_description: p.seoDescription || '',
            }),
          };

          const fd = new FormData();
          Object.entries(productPayload).forEach(([k, v]) => {
            if (v !== null && v !== undefined) fd.append(k, String(v));
          });

          await apiFetch('/shop/products/', {
            method: 'POST',
            body: fd,
          });
          updatedCount++;
        }

        setImportSummary(`Successfully imported ${updatedCount} products from CSV.`);
        onSuccess();
      } catch (fallbackErr: any) {
        console.error(fallbackErr);
        setError(err.message || fallbackErr.message || 'Failed to import CSV file.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Import products by CSV</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importSummary && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* File Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer"
          >
            <Upload className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">
              Drag and drop your product CSV file here
            </p>
            <p className="text-xs text-muted-foreground mb-4">or click to browse from your computer (.csv)</p>
            <label className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground font-semibold rounded-xl text-xs transition cursor-pointer">
              Add file
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            {file && (
              <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-primary">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>

          {/* Overwrite Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                Overwrite any current products that have the same handle
              </span>
              <span className="text-xs text-muted-foreground">
                Existing values will be updated with values from your CSV.
              </span>
            </div>
          </label>
        </div>

        {/* Modal Footer */}
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
            disabled={!file || isProcessing}
            onClick={handleImport}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg transition text-sm cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Upload and import</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
