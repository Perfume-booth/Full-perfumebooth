'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Info,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import AnalyticsCard from './AnalyticsCard';
import { 
  CARDS, 
  SOURCES, 
  Report, 
  Cell, 
  csvCell, 
  daysBefore, 
  isSocialReferrer, 
  loadReport, 
  todayIST 
} from './dashboard-data';

export default function AnalyticsDashboard() {
  const userId = useAuthStore(state => state.user?.id);
  const [range, setRange] = useState(() => ({ start: daysBefore(todayIST(), 29), end: todayIST() }));
  const [draft, setDraft] = useState(range);
  const [refresh, setRefresh] = useState(0);
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string[]>(SOURCES);
  const [validation, setValidation] = useState('');

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setReports({});
    setErrors({});
    setPending(SOURCES);
    let next = 0;

    // Bound concurrency: no 20-request burst against the reporting database.
    async function worker() {
      while (next < SOURCES.length && !controller.signal.aborted) {
        const source = SOURCES[next++];
        try {
          const report = await loadReport(source, range.start, range.end, controller.signal);
          if (!controller.signal.aborted) {
            setReports(previous => ({ ...previous, [source]: report }));
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setErrors(previous => ({
              ...previous,
              [source]: error instanceof Error ? error.message : 'Unable to load report.',
            }));
          }
        } finally {
          if (!controller.signal.aborted) {
            setPending(previous => previous.filter(item => item !== source));
          }
        }
      }
    }

    void Promise.all(Array.from({ length: 3 }, worker));
    return () => controller.abort();
  }, [userId, range.start, range.end, refresh]);

  function applyRange(start: string, end: string) {
    if (!start || !end || start > end || end > todayIST()) {
      setValidation('Choose an ordered date range ending no later than today.');
      return;
    }
    setValidation('');
    setDraft({ start, end });
    setRange({ start, end });
    setRefresh(value => value + 1);
  }

  function exportCSV() {
    const rows: Cell[][] = [
      ['PerfumeBooth analytics dashboard preview'],
      ['Start', range.start],
      ['Through', range.end],
      ['Timezone', 'Asia/Kolkata'],
      ['Currency', 'INR'],
    ];

    for (const card of CARDS) {
      rows.push([], [card.title]);
      const report = card.source ? reports[card.source] : undefined;
      if (report) {
        rows.push(
          ['Status', report.data_state || report.status],
          ['Reason', report.reason],
          ['Generated', report.generatedAt],
          ['Loaded rows', report.rows.length, 'Total rows', report.total],
          ...report.notes.map(note => [note]),
          report.columns,
          ...(card.social ? report.rows.filter(row => isSocialReferrer(row[0])) : report.rows)
        );
      } else {
        rows.push([card.reason || (card.source && errors[card.source]) || 'Unavailable']);
      }
    }

    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analytics-preview-${range.start}-${range.end}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const timestamps = Object.values(reports).map(report => report.generatedAt).filter(Boolean).sort();

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card neu-extruded p-6 rounded-3xl border border-border/10">
        <div>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Storefront Business Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground text-xs font-bold mt-1">
            Storefront performance, sales funnels, and customer behavior metrics (INR · Asia/Kolkata)
            {timestamps.length > 0 &&
              ` · Refreshed ${new Date(timestamps[timestamps.length - 1]).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
              })}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRefresh(v => v + 1)}
            disabled={pending.length > 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl neu-btn text-xs font-black text-foreground hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Refresh all metrics"
          >
            <RefreshCw size={14} className={pending.length > 0 ? 'animate-spin text-primary' : ''} />
            <span>{pending.length > 0 ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            disabled={pending.length > 0 || !timestamps.length}
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 neu-btn-primary font-black rounded-2xl text-xs transition duration-200 cursor-pointer disabled:opacity-50 text-primary"
            title="Download formatted analytics CSV preview"
          >
            <Download size={14} />
            <span>Export Preview CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Scope Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card neu-extruded p-4 rounded-3xl border border-border/10">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={event => {
            event.preventDefault();
            applyRange(draft.start, draft.end);
          }}
        >
          {/* Quick Period Selector */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              aria-label="Quick range"
              defaultValue=""
              onChange={event => {
                if (event.target.value) {
                  applyRange(daysBefore(todayIST(), Number(event.target.value) - 1), todayIST());
                  event.target.value = '';
                }
              }}
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-card text-foreground">Select Preset</option>
              <option value="1" className="bg-card text-foreground">Today</option>
              <option value="7" className="bg-card text-foreground">Last 7 Days</option>
              <option value="30" className="bg-card text-foreground">Last 30 Days</option>
              <option value="90" className="bg-card text-foreground">Last 90 Days</option>
              <option value="365" className="bg-card text-foreground">Last 1 Year</option>
              <option value="730" className="bg-card text-foreground">Last 2 Years</option>
              <option value="1825" className="bg-card text-foreground">All Time (5 Years)</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={draft.start}
              max={todayIST()}
              onChange={event => setDraft({ ...draft, start: event.target.value })}
              required
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 px-3.5 py-2 neu-inset-sm border border-border/20 rounded-2xl">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={draft.end}
              max={todayIST()}
              onChange={event => setDraft({ ...draft, end: event.target.value })}
              required
              className="bg-transparent text-xs font-black text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-2xl neu-btn text-xs font-black text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </form>

        {/* Live Loading / Sync Status */}
        <div className="flex items-center gap-2 px-3 py-1 text-xs font-black">
          {pending.length > 0 ? (
            <span className="flex items-center gap-2 text-amber-500 font-extrabold neu-inset-sm px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{pending.length} reports loading…</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-emerald-500 font-extrabold neu-inset-sm px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{Object.keys(reports).length} reports loaded</span>
            </span>
          )}
        </div>
      </div>

      {/* Validation Message */}
      {validation && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validation}</span>
        </div>
      )}

      {/* Context & Data Integrity Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-card neu-extruded border border-border/10 text-xs font-bold text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          Showing <strong className="text-foreground">{range.start}</strong> through{' '}
          <strong className="text-foreground">{range.end}</strong>. Sales metrics include qualifying paid orders
          (excluding cancelled and refunded orders). Traffic covers consented observations only. Missing sources are
          reported as unavailable, never fabricated.
          {Object.keys(errors).length > 0 && (
            <span className="text-amber-500 font-black ml-1">
              ({Object.keys(errors).length} sources failed to load — click Refresh to retry).
            </span>
          )}
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {CARDS.map(card => (
          <AnalyticsCard
            key={`${card.title}:${range.start}:${range.end}:${refresh}`}
            card={card}
            report={card.source ? reports[card.source] : undefined}
            error={card.source ? errors[card.source] : undefined}
            pending={!!card.source && pending.includes(card.source)}
          />
        ))}
      </div>

      {/* Footer Navigation Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-card neu-extruded border border-border/10 text-xs font-bold text-muted-foreground mt-2">
        <p>
          Dashboard exports contain loaded preview rows. For full historical raw exports and scheduled integration
          status, visit Reports.
        </p>
        <Link
          href="/reports"
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl neu-btn font-black text-xs text-primary shrink-0 hover:scale-105 transition-transform"
        >
          <span>Open Full Reports</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
