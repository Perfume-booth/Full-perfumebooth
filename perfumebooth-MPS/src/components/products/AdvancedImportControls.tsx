'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface AdvancedJob {
  job_id: string; status: string; filename?: string; can_undo?: boolean;
  schedule_state?: string; scheduled_at?: string; sale_ends_at?: string;
  undone_at?: string; error_message?: string;
}
interface Mapping { id: number; name: string; columns: Record<string, string>; }
const root = '/shop/products/advanced-import';
const inputStyle = 'w-full rounded-lg border border-border bg-secondary p-2 text-sm';
const buttonStyle = 'rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50';

export default function AdvancedImportControls({ job, disabled, mappingId, onMapping, onJobChanged }: {
  job: AdvancedJob | null; disabled: boolean; mappingId: string;
  onMapping: (id: string) => void; onJobChanged: (job: AdvancedJob) => void;
}) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [rows, setRows] = useState([{ source: '', field: 'sku' }]);
  const [history, setHistory] = useState<AdvancedJob[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const execute = async (work: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed.'); }
    finally { setBusy(false); }
  };
  const load = () => execute(async () => {
    const [saved, recent] = await Promise.all([
      apiFetch<{ mappings: Mapping[]; fields: string[] }>(`${root}/mappings/`),
      apiFetch<{ jobs: AdvancedJob[] }>(`${root}/history/`),
    ]);
    setMappings(saved.mappings); setFields(saved.fields); setHistory(recent.jobs);
    setMessage('Saved mappings and recent jobs refreshed.');
  });
  const saveMapping = () => execute(async () => {
    const columns: Record<string, string> = {};
    for (const row of rows) {
      if (!row.source.trim()) throw new Error('Enter a source header for every mapping row.');
      if (row.source.trim() in columns) throw new Error('Source headers must be unique.');
      columns[row.source.trim()] = row.field;
    }
    const saved = await apiFetch<Mapping>(`${root}/mappings/`, { method: 'POST', body: JSON.stringify({ name, columns }) });
    setMappings(current => [...current.filter(m => m.id !== saved.id), saved]);
    onMapping(String(saved.id)); setMessage('Mapping saved and selected for the next preview.');
  });
  const action = (target: AdvancedJob, kind: 'schedule' | 'undo' | 'cancel-schedule') => {
    if (kind === 'undo' && !window.confirm('Undo only the imported fields? Later edits or stock conflicts will block the whole undo.')) return;
    void execute(async () => {
      const body = kind === 'schedule' ? { starts_at: new Date(startsAt).toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null } : {};
      const updated = await apiFetch<AdvancedJob>(`${root}/${target.job_id}/${kind}/`, { method: 'POST', body: JSON.stringify(body) });
      if (job?.job_id === target.job_id) onJobChanged(updated);
      setHistory(current => current.map(item => item.job_id === updated.job_id ? { ...item, ...updated } : item));
      setMessage(kind === 'schedule' ? 'Scheduled. Celery Beat and the imports worker must be running.' : kind === 'undo' ? 'Import changes undone.' : 'Schedule cancelled.');
    });
  };
  const locked = disabled || busy;
  return <details className="rounded-xl border border-border p-3">
    <summary className="cursor-pointer text-sm font-semibold">Advanced operations, mappings & history</summary>
    <div className="mt-3 space-y-4">
      <p className="text-xs text-muted-foreground">Use the template’s Bulk Actions sheet: PRICE_PERCENT, PRICE_DELTA, PRICE_SET, STOCK_DELTA, SET_STATUS, SET_BRAND, SET_CATEGORY, SET_TAGS, ADD_TAGS, REMOVE_TAGS, FIND_REPLACE, ADD_COLLECTION, REMOVE_COLLECTION. Positive/negative values increase/decrease prices or stock. Find-and-replace is literal and case-sensitive; use Field, Find and Replace columns.</p>
      <button className={buttonStyle} disabled={locked} onClick={load}>Load mappings & recent imports</button>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
      <label className="block text-xs">Saved Products-sheet mapping<select className={inputStyle} disabled={locked || !!job} value={mappingId} onChange={e => onMapping(e.target.value)}><option value="">Standard template headers</option>{mappings.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <details><summary className="cursor-pointer text-xs">Create or edit a mapping</summary>
        <p className="my-2 text-xs">Same name updates your saved mapping. Existing previews keep their original mapping.</p>
        <input aria-label="Mapping name" className={inputStyle} placeholder="Supplier mapping name" value={name} onChange={e => setName(e.target.value)} disabled={locked} />
        {rows.map((row, index) => <div key={index} className="my-2 flex gap-2">
          <input aria-label={`Source header ${index + 1}`} className={inputStyle} value={row.source} placeholder="Supplier column header" disabled={locked} onChange={e => setRows(current => current.map((r, i) => i === index ? { ...r, source: e.target.value } : r))} />
          <select aria-label={`Destination field ${index + 1}`} className={inputStyle} value={row.field} disabled={locked} onChange={e => setRows(current => current.map((r, i) => i === index ? { ...r, field: e.target.value } : r))}>{(fields.length ? fields : ['sku', 'slug', 'price', 'stock', 'title', 'brand', 'category', 'tags']).map(f => <option key={f}>{f}</option>)}</select>
          <button aria-label={`Remove mapping row ${index + 1}`} className={buttonStyle} disabled={locked || rows.length === 1} onClick={() => setRows(current => current.filter((_, i) => i !== index))}>×</button>
        </div>)}
        <div className="flex gap-2"><button className={buttonStyle} disabled={locked} onClick={() => setRows(current => [...current, { source: '', field: 'price' }])}>Add column</button><button className={buttonStyle} disabled={locked || !name.trim() || !!job} onClick={saveMapping}>Save mapping</button></div>
      </details>
      {job?.status === 'preview_ready' && !job.schedule_state && <div className="space-y-2 border-t border-border pt-3">
        <p className="text-sm font-semibold">Schedule prices / sale window</p>
        <p className="text-xs">Price-only workbooks. Dates use your browser’s timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Optional sale end restores original prices only if they have not changed.</p>
        <label className="block text-xs">Start<input type="datetime-local" className={inputStyle} value={startsAt} disabled={locked} onChange={e => setStartsAt(e.target.value)} /></label>
        <label className="block text-xs">Sale end (optional)<input type="datetime-local" className={inputStyle} value={endsAt} disabled={locked} onChange={e => setEndsAt(e.target.value)} /></label>
        <button className={buttonStyle} disabled={locked || !startsAt} onClick={() => action(job, 'schedule')}>Schedule approved prices</button>
      </div>}
      {job?.schedule_state && <p className="text-sm">Schedule: {job.schedule_state}. {job.scheduled_at && new Date(job.scheduled_at).toLocaleString()}</p>}
      {job?.schedule_state === 'pending' && <button className={buttonStyle} disabled={locked} onClick={() => action(job, 'cancel-schedule')}>Cancel schedule</button>}
      {job?.can_undo && <button className={buttonStyle} disabled={locked} onClick={() => action(job, 'undo')}>Undo from snapshot</button>}
      <p className="text-xs text-muted-foreground">Undo supports field updates and bulk actions. Imports creating/deleting records or changing images are not automatically reversible. No later edits are overwritten.</p>
      {history.length > 0 && <ul className="space-y-2">{history.map(item => <li key={item.job_id} className="rounded-lg border border-border p-2 text-xs">
        <p className="break-all">{item.filename} · {item.status} · {item.schedule_state || (item.undone_at ? 'undone' : 'unscheduled')}</p>
        {item.error_message && <p className="text-red-400">{item.error_message}</p>}
        {item.can_undo && <button className={buttonStyle} disabled={locked} onClick={() => action(item, 'undo')}>Undo</button>}
        {item.schedule_state === 'pending' && <button className={buttonStyle} disabled={locked} onClick={() => action(item, 'cancel-schedule')}>Cancel schedule</button>}
      </li>)}</ul>}
    </div>
  </details>;
}
