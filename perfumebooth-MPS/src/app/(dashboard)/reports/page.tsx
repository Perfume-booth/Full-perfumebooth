'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  FileSpreadsheet,
  BarChart2,
  Table as TableIcon,
  Download,
  RefreshCw,
  Calendar,
  Search,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';

type Entry = { id: string; title: string; group: string; status: string; reason: string };
type Result = Entry & {
  columns: string[];
  rows: (string | number | null)[][];
  notes: string[];
  total: number;
  page: number;
  page_size: number;
  start: string;
  end: string;
  generatedAt: string;
  data_state?: string;
  history_start?: string | null;
};

function indiaDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

const CustomChartTooltip = ({ active, payload, label, isCurrency }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-card neu-extruded p-3 rounded-2xl border border-border/20 text-xs font-black shadow-2xl">
        <p className="text-muted-foreground mb-1 text-[11px] font-bold">{label}</p>
        <p className="text-foreground">
          {payload[0].name || 'Value'}:{' '}
          <span className="text-primary font-black">
            {typeof val === 'number'
              ? isCurrency
                ? `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                : val.toLocaleString('en-IN')
              : val}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

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

  // Graph custom controls
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'table'>('both');
  const [selectedMetricIndex, setSelectedMetricIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setCatalogError('');
    apiFetch<{ reports: Entry[] }>('/shop/reports/')
      .then(data => {
        if (active) setCatalog(data.reports);
      })
      .catch(e => {
        if (active) setCatalogError(e.message || 'Cannot load report catalog');
      });
    return () => {
      active = false;
    };
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setResult(null);
    setError('');
    setExportError('');
    setSelectedMetricIndex(null);

    const query = new URLSearchParams({ start, end, page: String(page), page_size: '200' });
    apiFetch<Result>(`/shop/reports/${selected}/?${query}`)
      .then(data => {
        if (active) setResult(data);
      })
      .catch(e => {
        if (active) setError(e.message || 'Cannot load this report');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, selected, start, end, page, refresh]);

  async function exportCSV() {
    if (!result || loading || exporting || result.status !== 'available') return;
    setExporting(true);
    setExportError('');
    try {
      const query = new URLSearchParams({ start, end, export: 'csv' });
      const response = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/shop/reports/${selected}/?${query}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed. Check your session and date range, then retry.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selected}_${start}_${end}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function applyPreset(days: number) {
    if (days >= 9999) {
      setStart('2024-01-01');
    } else {
      setStart(indiaDate(-days));
    }
    setEnd(indiaDate());
    setPage(1);
    setRefresh(n => n + 1);
  }

  const visible = catalog.filter(
    r => (group === 'All' || r.group === group) && `${r.title} ${r.group}`.toLowerCase().includes(search.toLowerCase())
  );
  const availableCount = catalog.filter(r => r.status === 'available').length;

  // Chart Data Extraction
  const chartAnalysis = useMemo(() => {
    if (!result || !result.rows || result.rows.length === 0 || !result.columns) {
      return null;
    }

    const cols = result.columns;
    const rows = result.rows;

    // Detect numeric column indices
    const numericColIndices: number[] = [];
    cols.forEach((_, colIdx) => {
      let countNumeric = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (parseNumeric(rows[i][colIdx]) !== null) countNumeric++;
      }
      if (countNumeric >= Math.min(5, rows.length) && colIdx !== 0) {
        numericColIndices.push(colIdx);
      }
    });

    if (numericColIndices.length === 0) return null;

    // Label column: prefer column 0 or column 1 if column 0 looks like an ID
    let labelIdx = 0;
    if (cols[0].toLowerCase().includes('id') && cols.length > 1) {
      labelIdx = 1;
    }

    // Default metric index: prefer columns with 'total' or 'gross' or 'sales' or 'count'
    let metricIdx = numericColIndices[0];
    const prioritized = numericColIndices.find(idx => {
      const name = cols[idx].toLowerCase();
      return name.includes('total') || name.includes('sales') || name.includes('gross') || name.includes('units');
    });
    if (prioritized !== undefined) {
      metricIdx = prioritized;
    }

    const activeMetricIdx = selectedMetricIndex !== null && numericColIndices.includes(selectedMetricIndex)
      ? selectedMetricIndex
      : metricIdx;

    const metricName = cols[activeMetricIdx];

    // Format chart rows
    const chartData = rows.map((row, idx) => {
      const rawLabel = row[labelIdx] ?? `Item ${idx + 1}`;
      const shortLabel = String(rawLabel).replace(/^PB/, '#').substring(0, 24);
      const val = parseNumeric(row[activeMetricIdx]);
      return {
        name: shortLabel,
        fullName: String(rawLabel),
        value: val ?? 0,
      };
    });

    // Summary calculations
    const values = chartData.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length ? sum / values.length : 0;
    const max = values.length ? Math.max(...values) : 0;

    const lowerName = metricName.toLowerCase();
    const isCurrency =
      (lowerName.includes('inr') ||
        lowerName.includes('sales') ||
        lowerName.includes('gross') ||
        lowerName.includes('revenue') ||
        lowerName.includes('price') ||
        lowerName.includes('amount') ||
        lowerName.includes('discount')) &&
      !lowerName.includes('unit') &&
      !lowerName.includes('count') &&
      !lowerName.includes('order');

    const isInteger =
      lowerName.includes('unit') ||
      lowerName.includes('count') ||
      lowerName.includes('order') ||
      lowerName.includes('quantity') ||
      lowerName.includes('records') ||
      !isCurrency;

    const integerTicks =
      isInteger && max <= 4
        ? Array.from({ length: Math.max(1, Math.round(max)) + 1 }, (_, i) => i)
        : undefined;

    return {
      numericColIndices,
      activeMetricIdx,
      metricName,
      chartData,
      sum,
      avg,
      max,
      isCurrency,
      isInteger,
      integerTicks,
    };
  }, [result, selectedMetricIndex]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card neu-extruded p-6 rounded-3xl border border-border/10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Storefront Reporting &amp; Business Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Reports &amp; Analytics Ledger</h1>
          <p className="text-muted-foreground text-xs font-bold mt-1">
            Single-store reporting • INR • Asia/Kolkata • {availableCount} active reports; {catalog.length - availableCount} awaiting data sources
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRefresh(n => n + 1)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl neu-btn text-xs font-black text-foreground hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Refresh current report"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
            <span>{loading ? 'Fetching…' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            disabled={loading || !result || result.status !== 'available' || exporting}
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-black rounded-2xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 text-primary"
            title="Download full filtered CSV export"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{exporting ? 'Exporting…' : 'Export Full CSV'}</span>
          </button>
        </div>
      </div>

      {/* Date Controls & Presets */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card neu-extruded p-4 rounded-3xl border border-border/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Period Presets */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              aria-label="Date preset"
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  applyPreset(Number(e.target.value));
                  e.target.value = '';
                }
              }}
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card text-foreground">Select Preset</option>
              <option value="0" className="bg-card text-foreground">Today</option>
              <option value="6" className="bg-card text-foreground">Last 7 Days</option>
              <option value="29" className="bg-card text-foreground">Last 30 Days</option>
              <option value="89" className="bg-card text-foreground">Last 90 Days</option>
              <option value="365" className="bg-card text-foreground">Last 1 Year</option>
              <option value="730" className="bg-card text-foreground">Last 2 Years</option>
              <option value="9999" className="bg-card text-foreground">All Time (Multi-Year)</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={start}
              max={end}
              onChange={e => {
                setStart(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={end}
              min={start}
              max={indiaDate()}
              onChange={e => {
                setEnd(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setRefresh(n => n + 1)}
            className="px-4 py-2 rounded-2xl neu-btn text-xs font-black text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </div>

        {/* View Mode Toggle (Graph vs Table) */}
        <div className="flex items-center gap-1.5 neu-inset-sm p-1.5 rounded-2xl border border-border/20">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'both' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers size={13} />
            <span>Graph &amp; Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'chart' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 size={13} />
            <span>Graph Only</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon size={13} />
            <span>Table Only</span>
          </button>
        </div>
      </div>

      {catalogError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{catalogError}</span>
        </div>
      )}
      {exportError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Main Grid: Sidebar + Report Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        {/* Reports Catalog Sidebar */}
        <aside className="bg-card neu-extruded border border-border/10 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Reports Catalog</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg neu-inset-sm text-primary">
              {visible.length} Total
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-3" />
            <input
              aria-label="Search reports"
              placeholder="Search reports…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent neu-inset-sm border border-border/20 pl-8 pr-3 py-2 rounded-2xl text-xs font-black text-foreground focus:outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 neu-inset-sm border border-border/20 rounded-2xl">
            <select
              aria-label="Report category"
              value={group}
              onChange={e => setGroup(e.target.value)}
              className="w-full bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-card text-foreground">All Categories</option>
              {Array.from(new Set(catalog.map(r => r.group))).map(g => (
                <option key={g} value={g} className="bg-card text-foreground">
                  {g}
                </option>
              ))}
            </select>
          </div>

          <nav aria-label="Reports" className="max-h-[600px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {visible.map(r => {
              const isSelected = selected === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(r.id);
                    setPage(1);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/30 neu-inset-sm'
                      : 'hover:bg-muted/30 text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{r.title}</span>
                    {isSelected && <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <span className="block text-[10px] font-bold text-muted-foreground mt-1">
                    {r.group} · {r.status === 'available' ? 'Active' : 'Awaiting data'}
                  </span>
                </button>
              );
            })}
            {!visible.length && (
              <p className="text-xs text-muted-foreground text-center py-6 font-bold">No matching reports found.</p>
            )}
          </nav>
        </aside>

        {/* Report Content Workspace */}
        <section aria-label="Report result" className="min-w-0 flex flex-col gap-5">
          {loading && (
            <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-card neu-extruded rounded-3xl border border-border/10 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm font-black text-foreground">Loading report ledger…</span>
              <span className="text-xs font-bold text-muted-foreground">Aggregating live transactions and metrics</span>
            </div>
          )}

          {error && (
            <div className="p-5 rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm mb-1">Failed to Load Report</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-5">
              {/* Report Header Card */}
              <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{result.title}</h2>
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full neu-inset-sm text-primary border border-primary/20">
                    {result.group}
                  </span>
                </div>
                <p className="text-xs font-bold text-muted-foreground">
                  Date range: {start} through {end} • Showing {result.rows.length} of {result.total} total rows
                </p>

                {result.data_state && (
                  <div className="mt-3 p-3.5 rounded-2xl neu-inset-sm border border-border/10 text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {result.data_state === 'disabled'
                        ? 'Data collection is disabled.'
                        : result.data_state === 'needs_credentials'
                        ? 'Requires API credentials and provider permissions.'
                        : result.data_state === 'sync_failed'
                        ? 'Latest sync failed. Historical rows may be stale.'
                        : result.data_state === 'awaiting_data'
                        ? 'Implemented and active — awaiting recorded transactions.'
                        : `Source data verified active${
                            result.history_start ? ` since ${new Date(result.history_start).toLocaleDateString()}` : ''
                          }.`}
                    </span>
                  </div>
                )}
              </div>

              {result.status !== 'available' ? (
                <div className="bg-card neu-extruded p-6 rounded-3xl border border-amber-500/30 text-amber-500 flex flex-col gap-2">
                  <strong className="text-sm font-black">Data Source Not Connected</strong>
                  <p className="text-xs font-bold text-muted-foreground">{result.reason}</p>
                </div>
              ) : (
                <>
                  {/* Visual Graph & Metrics Section (Shown when viewMode is 'both' or 'chart') */}
                  {(viewMode === 'both' || viewMode === 'chart') && chartAnalysis && (
                    <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-5">
                      {/* Graph Header & Chart Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-4">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          <span className="text-sm font-black text-foreground">Interactive Visual Graph</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Metric Selector Dropdown */}
                          {chartAnalysis.numericColIndices.length > 1 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 neu-inset-sm border border-border/20 rounded-xl text-xs font-black">
                              <span className="text-muted-foreground text-[10px] uppercase">Plot:</span>
                              <select
                                value={chartAnalysis.activeMetricIdx}
                                onChange={e => setSelectedMetricIndex(Number(e.target.value))}
                                className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
                              >
                                {chartAnalysis.numericColIndices.map(colIdx => (
                                  <option key={colIdx} value={colIdx} className="bg-card text-foreground">
                                    {result.columns[colIdx]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Summary KPI Badges */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl neu-inset-sm border border-border/10 flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Total Records
                          </span>
                          <span className="text-xl font-black text-foreground tracking-tight">
                            {result.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl neu-inset-sm border border-border/10 flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Total {chartAnalysis.metricName}
                          </span>
                          <span className="text-xl font-black text-primary tracking-tight">
                            {chartAnalysis.isCurrency
                              ? `₹${chartAnalysis.sum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : chartAnalysis.sum.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl neu-inset-sm border border-border/10 flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Average per Entry
                          </span>
                          <span className="text-xl font-black text-foreground tracking-tight">
                            {chartAnalysis.isCurrency
                              ? `₹${chartAnalysis.avg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : chartAnalysis.avg.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Render Visual Area Graph */}
                      <div className="h-[280px] w-full pt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartAnalysis.chartData} margin={{ top: 12, right: 24, left: 12, bottom: 20 }}>
                            <defs>
                              <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="currentColor" className="text-border/20" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fontWeight: 700 }}
                              tickLine={false}
                              axisLine={false}
                              className="text-muted-foreground"
                              minTickGap={25}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fontWeight: 700 }}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={6}
                              width={64}
                              allowDecimals={!chartAnalysis.isInteger}
                              domain={chartAnalysis.integerTicks ? [0, Math.max(1, Math.round(chartAnalysis.max))] : [0, 'auto']}
                              ticks={chartAnalysis.integerTicks}
                              className="text-muted-foreground"
                              tickFormatter={(v: number) => {
                                const prefix = chartAnalysis.isCurrency ? '₹' : '';
                                if (v >= 10000000) return `${prefix}${(v / 10000000).toFixed(1)}Cr`;
                                if (v >= 100000) return `${prefix}${(v / 100000).toFixed(1)}L`;
                                if (v >= 1000) return `${prefix}${(v / 1000).toFixed(0)}k`;
                                return `${prefix}${v}`;
                              }}
                            />
                            <Tooltip content={<CustomChartTooltip isCurrency={chartAnalysis.isCurrency} />} />
                            <Area
                              type="monotone"
                              dataKey="value"
                              name={chartAnalysis.metricName}
                              stroke="#9333ea"
                              strokeWidth={2.5}
                              fill="url(#reportGrad)"
                              dot={{ r: 4.5, fill: '#9333ea', strokeWidth: 1.5, stroke: '#ffffff' }}
                              activeDot={{ r: 6.5, fill: '#9333ea', strokeWidth: 2, stroke: '#ffffff' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Detailed Data Table Section (Shown when viewMode is 'both' or 'table') */}
                  {(viewMode === 'both' || viewMode === 'table') && (
                    <div className="bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-border/10 pb-3">
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-4 h-4 text-primary" />
                          <span className="text-sm font-black text-foreground">Detailed Ledger Table</span>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {result.total} records recorded
                        </span>
                      </div>

                      {result.rows.length ? (
                        <div className="neu-inset-sm rounded-2xl border border-border/20 overflow-hidden">
                          <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-muted/60 text-muted-foreground text-[10px] font-black uppercase tracking-wider sticky top-0 backdrop-blur-sm border-b border-border/20">
                                <tr>
                                  {result.columns.map((c, i) => (
                                    <th key={i} className="p-3.5 whitespace-nowrap">
                                      {c}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/10 font-bold text-foreground">
                                {result.rows.map((row, i) => (
                                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                                    {row.map((cell, j) => (
                                      <td key={j} className="p-3.5 max-w-[320px] truncate">
                                        {cell !== null && cell !== undefined ? String(cell) : '—'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground neu-inset-sm rounded-2xl border border-border/10">
                          <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-black">No matching records found for this period.</p>
                        </div>
                      )}

                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl neu-btn font-black text-xs text-foreground disabled:opacity-40 cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                          <span>Previous Page</span>
                        </button>
                        <span className="text-xs font-bold text-muted-foreground">
                          Page {page} of {Math.max(1, Math.ceil(result.total / result.page_size))}
                        </span>
                        <button
                          type="button"
                          disabled={page * result.page_size >= result.total}
                          onClick={() => setPage(p => p + 1)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl neu-btn font-black text-xs text-foreground disabled:opacity-40 cursor-pointer"
                        >
                          <span>Next Page</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes & Definitions Card */}
                  {result.notes && result.notes.length > 0 && (
                    <details className="bg-card neu-extruded p-5 rounded-3xl border border-border/10 text-xs font-bold text-muted-foreground group">
                      <summary className="cursor-pointer font-black text-foreground hover:text-primary transition-colors flex items-center justify-between">
                        <span>Report Definitions &amp; Calculation Rules</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                      </summary>
                      <ul className="list-disc pl-5 mt-3 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                        {result.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
