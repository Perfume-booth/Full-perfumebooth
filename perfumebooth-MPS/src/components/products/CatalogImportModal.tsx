'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Upload, X } from 'lucide-react';
import { apiDownload, apiFetch } from '@/lib/api';

interface CatalogImportModalProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; }
type ImportMode = 'UPDATE_ONLY' | 'CREATE_ONLY' | 'UPSERT';
interface ImportSummary { total_rows: number; matched_products: number; changed_products: number; changed_fields: number; unchanged_rows: number; unmatched_rows: number; invalid_rows: number; products_unaffected: number; created_products: number; updated_products: number; variant_rows: number; variants_to_add: number; variants_to_update: number; variants_to_delete: number; image_rows: number; images_to_add: number; images_to_replace: number; images_to_delete: number; bulk_action_rows: number; bulk_actions: number; }
interface ImportChange { row: number; handle: string; sku: string; field: string; old_value: unknown; new_value: unknown; }
interface ImportError { row: number; column: string; message: string; }
interface ImportCreate { row: number; slug: string; sku: string; title: string; price: string; stock: number; is_online: boolean; }
interface VariantOperation { row: number; action: 'ADD' | 'UPDATE' | 'DELETE'; product_handle: string; sku: string; title?: string; changes?: Record<string, unknown>; }
interface ImageOperation { row: number; action: 'ADD' | 'REPLACE' | 'DELETE'; product_handle: string; variant_sku?: string; image_id?: string; url?: string; is_primary: boolean; }
interface BulkOperation { row: number; target_type: 'PRODUCT' | 'VARIANT'; identifier: string; action: string; old_value: unknown; new_value: unknown; }
interface Preview { job_id: string; status: string; operation: 'preview' | 'apply'; progress: { current: number; total: number }; error_message?: string; summary: ImportSummary; changes: ImportChange[]; creates: ImportCreate[]; variants: VariantOperation[]; images: ImageOperation[]; bulk_actions: BulkOperation[]; errors: ImportError[]; }

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const PENDING_JOB_KEY = 'perfumebooth.catalogImportJob';

export default function CatalogImportModal({ isOpen, onClose, onSuccess }: CatalogImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('UPDATE_ONLY');
  const [draftDefault, setDraftDefault] = useState(true);
  useEffect(() => {
    if (!isOpen || preview) return;
    const jobId = window.localStorage.getItem(PENDING_JOB_KEY);
    if (!jobId) return;
    let cancelled = false;
    const resume = async () => {
      if (!cancelled) setBusy(true);
      try {
        for (let attempt = 0; attempt < 900 && !cancelled; attempt += 1) {
          const current = await apiFetch<Preview>(`/shop/products/excel-import/${jobId}/`);
          if (!cancelled) setPreview(current);
          if (['preview_ready', 'invalid', 'applied', 'failed', 'cancelled'].includes(current.status)) {
            if (current.status === 'failed' && !cancelled) setError(current.error_message || 'The background import failed.');
            if (current.status === 'applied') window.localStorage.removeItem(PENDING_JOB_KEY);
            return;
          }
          await sleep(1000);
        }
      } catch {
        window.localStorage.removeItem(PENDING_JOB_KEY);
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void resume();
    return () => { cancelled = true; };
  }, [isOpen, preview]);
  if (!isOpen) return null;

  const pollJob = async (jobId: string, terminalStatuses: string[]) => {
    for (let attempt = 0; attempt < 900; attempt += 1) {
      const current = await apiFetch<Preview>(`/shop/products/excel-import/${jobId}/`);
      setPreview(current);
      if (terminalStatuses.includes(current.status)) return current;
      if (current.status === 'failed') throw new Error(current.error_message || 'The background import failed.');
      await sleep(1000);
    }
    throw new Error('The import is still running. Close this window and check the job again shortly.');
  };
  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!/\.(csv|xlsx)$/i.test(selected.name)) { setError('Choose a .csv or .xlsx file.'); return; }
    window.localStorage.removeItem(PENDING_JOB_KEY);
    setFile(selected); setPreview(null); setError(null); setSuccess(null);
  };
  const makePreview = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('mode', mode); formData.append('draft_default', String(draftDefault));
      const queued = await apiFetch<Preview>('/shop/products/excel-import/', { method: 'POST', body: formData });
      window.localStorage.setItem(PENDING_JOB_KEY, queued.job_id);
      setPreview(queued);
      await pollJob(queued.job_id, ['preview_ready', 'invalid']);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not preview the file.'); }
    finally { setBusy(false); }
  };
  const applyChanges = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const queued = await apiFetch<Preview>(`/shop/products/excel-import/${preview.job_id}/apply/`, { method: 'POST' });
      const applied = await pollJob(queued.job_id, ['applied']);
      const variantTotal = preview.summary.variants_to_add + preview.summary.variants_to_update + preview.summary.variants_to_delete;
      const imageTotal = preview.summary.images_to_add + preview.summary.images_to_replace + preview.summary.images_to_delete;
      setPreview(applied);
      window.localStorage.removeItem(PENDING_JOB_KEY);
      setSuccess(`Created ${applied.summary.created_products}, updated ${applied.summary.updated_products} products, and applied ${variantTotal} variant, ${imageTotal} image, plus ${applied.summary.bulk_actions} advanced operations.`);
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not apply the update.'); }
    finally { setBusy(false); }
  };
  const downloadErrors = async () => {
    if (!preview) return;
    try {
      const blob = await apiDownload(`/shop/products/excel-import/${preview.job_id}/errors/`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `product-import-errors-${preview.job_id}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not download errors.'); }
  };
  const retryJob = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const queued = await apiFetch<Preview>(`/shop/products/excel-import/${preview.job_id}/retry/`, { method: 'POST' });
      window.localStorage.setItem(PENDING_JOB_KEY, queued.job_id);
      setPreview(queued);
      const terminal = queued.operation === 'preview' ? ['preview_ready', 'invalid'] : ['applied'];
      const completed = await pollJob(queued.job_id, terminal);
      if (completed.status === 'applied') { window.localStorage.removeItem(PENDING_JOB_KEY); setSuccess('Catalog import applied successfully.'); onSuccess(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not retry the import.'); }
    finally { setBusy(false); }
  };
  const downloadTemplate = async () => {
    setError(null);
    try {
      const blob = await apiDownload(`/shop/products/excel-import/template/?mode=${mode}`);
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `perfumebooth-products-${mode.toLowerCase()}-template-v7.xlsx`; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not download the template.'); }
  };

  const metrics: [string, number][] = preview ? [
    ['Rows', preview.summary.total_rows], ['Matched', preview.summary.matched_products],
    ['Creating', preview.summary.created_products], ['Updating', preview.summary.updated_products],
    ['Invalid rows', preview.summary.invalid_rows], ['Unmatched', preview.summary.unmatched_rows],
    ['Unchanged rows', preview.summary.unchanged_rows], ['Products unaffected', preview.summary.products_unaffected],
    ['Variants to add', preview.summary.variants_to_add], ['Variants to update', preview.summary.variants_to_update],
    ['Variants to delete', preview.summary.variants_to_delete],
    ['Images to add', preview.summary.images_to_add], ['Images to replace', preview.summary.images_to_replace],
    ['Images to delete', preview.summary.images_to_delete],
    ['Bulk actions', preview.summary.bulk_actions],
  ] : [];

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div><h2 className="text-lg font-bold">Bulk product import</h2><p className="text-xs text-muted-foreground">Preview every create or update before changing the catalog.</p></div>
        <button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-300"><span>Products match by <b>Handle</b> or <b>SKU</b>. Manage variants on the Variants sheet with explicit <b>ADD</b>, <b>UPDATE</b>, or <b>DELETE</b>. Blank cells keep current values.</span><button onClick={downloadTemplate} className="flex shrink-0 items-center gap-1 rounded-lg border border-blue-400/30 px-3 py-2 font-semibold hover:bg-blue-400/10"><Download className="h-4 w-4" />Download template</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Import mode<select value={mode} onChange={(e) => { setMode(e.target.value as ImportMode); setPreview(null); setSuccess(null); }} className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm"><option value="UPDATE_ONLY">Update existing only</option><option value="CREATE_ONLY">Create new only</option><option value="UPSERT">Create new + update existing</option></select></label>
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><input type="checkbox" checked={draftDefault} onChange={(e) => { setDraftDefault(e.target.checked); setPreview(null); }} />New products default to draft</label>
        </div>
        {error && <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        {success && <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}
        {preview && ['queued', 'processing', 'apply_queued', 'applying'].includes(preview.status) && <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300"><Loader2 className="h-4 w-4 animate-spin" /><span>{preview.status === 'queued' || preview.status === 'processing' ? 'Building preview in the background…' : 'Applying the approved import in the background…'} ({preview.progress.current}/{preview.progress.total || 1})</span></div>}
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }} className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center">
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold">Drop a CSV or Excel file here</p>
          <label className="mt-3 cursor-pointer rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold">Choose file<input type="file" accept=".csv,.xlsx" onChange={(e) => chooseFile(e.target.files?.[0])} className="hidden" /></label>
          {file && <div className="mt-3 flex items-center gap-2 text-xs text-primary"><FileText className="h-4 w-4" />{file.name}</div>}
        </div>
        {preview && ['preview_ready', 'invalid', 'applied'].includes(preview.status) && <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-border p-3"><div className="text-xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div>
          {preview.errors.length > 0 && <div className="rounded-xl border border-red-500/20"><div className="flex items-center justify-between p-3 text-sm font-semibold text-red-400"><span>Fix these errors and upload again</span><button onClick={downloadErrors} className="flex items-center gap-1"><Download className="h-4 w-4" />Error workbook</button></div>{preview.errors.slice(0, 20).map((item, i) => <div key={`${item.row}-${i}`} className="border-t border-border px-3 py-2 text-xs">Row {item.row}, {item.column || 'file'}: {item.message}</div>)}</div>}
          {preview.creates.length > 0 && <div className="overflow-x-auto rounded-xl border border-emerald-500/20"><div className="p-3 text-sm font-semibold text-emerald-400">New products</div><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-2">Row</th><th className="p-2">Handle</th><th className="p-2">SKU</th><th className="p-2">Title</th><th className="p-2">Price</th><th className="p-2">Status</th></tr></thead><tbody>{preview.creates.slice(0, 50).map((item) => <tr key={`${item.row}-${item.sku}`} className="border-t border-border"><td className="p-2">{item.row}</td><td className="p-2">{item.slug}</td><td className="p-2">{item.sku}</td><td className="p-2">{item.title}</td><td className="p-2">{item.price}</td><td className="p-2">{item.is_online ? 'Active' : 'Draft'}</td></tr>)}</tbody></table></div>}
          {preview.changes.length > 0 && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-2">Row</th><th className="p-2">Product</th><th className="p-2">Field</th><th className="p-2">Current</th><th className="p-2">New</th></tr></thead><tbody>{preview.changes.slice(0, 50).map((item, i) => <tr key={`${item.row}-${item.field}-${i}`} className="border-t border-border"><td className="p-2">{item.row}</td><td className="p-2">{item.handle}</td><td className="p-2">{item.field}</td><td className="max-w-40 truncate p-2">{JSON.stringify(item.old_value)}</td><td className="max-w-40 truncate p-2">{JSON.stringify(item.new_value)}</td></tr>)}</tbody></table></div>}
          {preview.variants.length > 0 && <div className="overflow-x-auto rounded-xl border border-violet-500/20"><div className="p-3 text-sm font-semibold text-violet-400">Variant operations</div><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-2">Row</th><th className="p-2">Action</th><th className="p-2">Product</th><th className="p-2">Variant SKU</th><th className="p-2">Details</th></tr></thead><tbody>{preview.variants.slice(0, 50).map((item) => <tr key={`${item.row}-${item.sku}`} className="border-t border-border"><td className="p-2">{item.row}</td><td className="p-2 font-semibold">{item.action}</td><td className="p-2">{item.product_handle}</td><td className="p-2">{item.sku}</td><td className="max-w-64 truncate p-2">{item.action === 'UPDATE' ? JSON.stringify(item.changes) : item.title || '—'}</td></tr>)}</tbody></table></div>}
          {preview.images.length > 0 && <div className="overflow-x-auto rounded-xl border border-cyan-500/20"><div className="p-3 text-sm font-semibold text-cyan-400">Image operations</div><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-2">Row</th><th className="p-2">Action</th><th className="p-2">Product</th><th className="p-2">Target</th><th className="p-2">Primary</th></tr></thead><tbody>{preview.images.slice(0, 50).map((item) => <tr key={`${item.row}-${item.variant_sku || item.image_id || item.url}`} className="border-t border-border"><td className="p-2">{item.row}</td><td className="p-2 font-semibold">{item.action}</td><td className="p-2">{item.product_handle}</td><td className="max-w-64 truncate p-2">{item.variant_sku || item.image_id || item.url}</td><td className="p-2">{item.is_primary ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>}
          {preview.bulk_actions.length > 0 && <div className="overflow-x-auto rounded-xl border border-orange-500/20"><div className="p-3 text-sm font-semibold text-orange-400">Advanced bulk actions</div><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-2">Row</th><th className="p-2">Target</th><th className="p-2">Action</th><th className="p-2">Current</th><th className="p-2">Result</th></tr></thead><tbody>{preview.bulk_actions.slice(0, 50).map((item) => <tr key={`${item.row}-${item.identifier}-${item.action}`} className="border-t border-border"><td className="p-2">{item.row}</td><td className="p-2">{item.target_type}: {item.identifier}</td><td className="p-2 font-semibold">{item.action}</td><td className="max-w-48 truncate p-2">{JSON.stringify(item.old_value)}</td><td className="max-w-48 truncate p-2">{JSON.stringify(item.new_value)}</td></tr>)}</tbody></table></div>}
        </>}
      </div>
      <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Close</button>
        {!preview && <button disabled={!file || busy} onClick={makePreview} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview changes'}</button>}
        {preview?.status === 'preview_ready' && !success && <button disabled={busy || preview.errors.length > 0 || (preview.summary.changed_fields === 0 && preview.summary.created_products === 0 && preview.variants.length === 0 && preview.images.length === 0 && preview.bulk_actions.length === 0)} onClick={applyChanges} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Apply ${preview.summary.created_products + preview.summary.updated_products} products + ${preview.variants.length} variants + ${preview.images.length} images + ${preview.bulk_actions.length} actions`}</button>}
        {preview?.status === 'failed' && <button disabled={busy} onClick={retryJob} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Retry failed job'}</button>}
      </div>
    </div>
  </div>;
}
