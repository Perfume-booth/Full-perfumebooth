'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

type Entry = { id: string; title: string; group: string; status: string; reason: string };
type Result = Entry & { columns: string[]; rows: (string | number | null)[][]; notes: string[];
  total: number; page: number; page_size: number; start: string; end: string; generatedAt: string };
function indiaDate(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [catalog, setCatalog] = useState<Entry[]>([]);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('All');
  const [selected, setSelected] = useState('sales-orders');
  const [start, setStart] = useState(() => indiaDate(-29));
  const [end, setEnd] = useState(() => indiaDate());
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    setCatalogError('');
    apiFetch<{ reports: Entry[] }>('/shop/reports/').then(data => { if (active) setCatalog(data.reports); })
      .catch(e => { if (active) setCatalogError(e.message || 'Cannot load report catalog'); });
    return () => { active = false; };
  }, [user, refresh]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setResult(null); setError(''); setExportError('');
    const query = new URLSearchParams({ start, end, page: String(page) });
    apiFetch<Result>(`/shop/reports/${selected}/?${query}`).then(data => { if (active) setResult(data); })
      .catch(e => { if (active) setError(e.message || 'Cannot load this report'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, selected, start, end, page, refresh]);
  async function exportCSV() {
    if (!result || loading || exporting || result.status !== 'available') return;
    setExporting(true); setExportError('');
    try {
      const query = new URLSearchParams({ start, end, export: 'csv' });
      const response = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/shop/reports/${selected}/?${query}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed. Check your session and date range, then retry.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url;
      link.download = `${selected}_${start}_${end}.csv`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setExportError(e instanceof Error ? e.message : 'Export failed'); }
    finally { setExporting(false); }
  }
  const visible = catalog.filter(r => (group === 'All' || r.group === group) && `${r.title} ${r.group}`.toLowerCase().includes(search.toLowerCase()));
  const available = catalog.filter(r => r.status === 'available').length;
  return <div className="flex flex-col gap-5 pb-12 min-w-0">
    <header><h1 className="text-3xl font-bold">Reports</h1>
      <p className="text-sm text-muted-foreground mt-2">Single-store reporting • INR • Asia/Kolkata. {available} available reports; {catalog.length - available} awaiting data sources.</p></header>
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">From<input aria-label="Report start" type="date" value={start} max={end} onChange={e => { setStart(e.target.value); setPage(1); }} className="block bg-card border border-border rounded-xl p-2" /></label>
      <label className="text-sm">Through<input aria-label="Report end" type="date" value={end} min={start} max={indiaDate()} onChange={e => { setEnd(e.target.value); setPage(1); }} className="block bg-card border border-border rounded-xl p-2" /></label>
      <button className="neu-btn px-4 py-2 rounded-xl" onClick={() => setRefresh(n => n+1)}>Refresh</button>
      <button disabled={loading || !result || result.status !== 'available' || exporting} onClick={exportCSV} className="neu-btn-primary px-4 py-2 rounded-xl disabled:opacity-50">{exporting ? 'Exporting…' : 'Export full CSV'}</button>
    </div>
    {catalogError && <p role="alert">{catalogError}</p>}
    {exportError && <p role="alert" className="text-red-500">{exportError}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5">
      <aside className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <input aria-label="Search reports" placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-background border border-border p-2 rounded-xl" />
        <select aria-label="Report category" value={group} onChange={e => setGroup(e.target.value)} className="w-full bg-background p-2 border border-border rounded-xl">
          <option>All</option>{Array.from(new Set(catalog.map(r => r.group))).map(g => <option key={g}>{g}</option>)}
        </select>
        <nav aria-label="Reports" className="max-h-[650px] overflow-auto space-y-1">
          {visible.map(r => <button key={r.id} aria-current={selected === r.id ? 'page' : undefined} onClick={() => { setSelected(r.id); setPage(1); }} className={`w-full text-left p-3 rounded-xl text-sm ${selected === r.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'}`}>
            {r.title}<span className="block text-xs text-muted-foreground mt-1">{r.group} · {r.status === 'available' ? 'Available' : 'Needs data source'}</span>
          </button>)}
          {!visible.length && <p className="text-sm p-3">No matching reports.</p>}
        </nav>
      </aside>
      <section aria-label="Report result" className="min-w-0 bg-card border border-border rounded-2xl p-5">
        {loading && <p role="status">Loading report…</p>}
        {error && <p role="alert" className="text-red-500">{error}</p>}
        {result && !loading && <>
          <h2 className="text-xl font-bold mb-3">{result.title}</h2>
          {result.status !== 'available' ? <div role="status" className="border border-amber-500/40 rounded-xl p-4"><strong>Data source not connected</strong><p className="mt-2 text-sm">{result.reason}</p><p className="mt-2 text-sm">This report is not implemented end to end yet. No historical results are estimated.</p></div> : <>
            <details className="text-sm mb-4" open><summary className="cursor-pointer font-semibold">Definitions and limitations</summary><ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">{result.notes.map(n => <li key={n}>{n}</li>)}</ul></details>
            <p className="text-xs text-muted-foreground mb-3">{result.total} rows · — means unknown, not zero. CSV includes every row in the filtered result.</p>
            {result.rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{result.columns.map((c,i) => <th key={i} className="p-3 border-b border-border whitespace-nowrap">{c}</th>)}</tr></thead><tbody>{result.rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j} className="p-3 border-b border-border/30 max-w-[320px] break-words">{cell ?? '—'}</td>)}</tr>)}</tbody></table></div> : <p role="status" className="py-12 text-center text-muted-foreground">No matching records in this period.</p>}
            <div className="flex gap-4 items-center mt-5 text-sm"><button disabled={page===1} onClick={() => setPage(p => p-1)} className="neu-btn p-2 rounded-xl disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, Math.ceil(result.total/result.page_size))}</span><button disabled={page*result.page_size>=result.total} onClick={() => setPage(p => p+1)} className="neu-btn p-2 rounded-xl disabled:opacity-40">Next</button></div>
          </>}
        </>}
      </section>
    </div>
  </div>;
}
