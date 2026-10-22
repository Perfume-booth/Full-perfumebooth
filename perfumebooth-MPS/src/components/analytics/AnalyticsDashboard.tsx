'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import AnalyticsCard from './AnalyticsCard';
import { CARDS, SOURCES, Report, Cell, csvCell, daysBefore, isSocialReferrer, loadReport, todayIST } from './dashboard-data';
import styles from './analytics.module.css';

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
    setReports({}); setErrors({}); setPending(SOURCES);
    let next = 0;
    // Bound concurrency: no 20-request burst against the reporting database.
    async function worker() {
      while (next < SOURCES.length && !controller.signal.aborted) {
        const source = SOURCES[next++];
        try {
          const report = await loadReport(source, range.start, range.end, controller.signal);
          if (!controller.signal.aborted) setReports(previous => ({ ...previous, [source]: report }));
        } catch (error) {
          if (!controller.signal.aborted) setErrors(previous => ({ ...previous, [source]: error instanceof Error ? error.message : 'Unable to load report.' }));
        } finally {
          if (!controller.signal.aborted) setPending(previous => previous.filter(item => item !== source));
        }
      }
    }
    void Promise.all(Array.from({ length: 3 }, worker));
    return () => controller.abort();
  }, [userId, range.start, range.end, refresh]);
  function applyRange(start: string, end: string) {
    if (!start || !end || start > end || end > todayIST() || (Date.parse(end) - Date.parse(start)) / 86400000 > 365) {
      setValidation('Choose a date range of at most 366 days, ending no later than today.'); return;
    }
    setValidation(''); setDraft({ start, end }); setRange({ start, end }); setRefresh(value => value + 1);
  }
  function exportCSV() {
    const rows: Cell[][] = [['PerfumeBooth analytics dashboard preview'], ['Start', range.start], ['Through', range.end], ['Timezone', 'Asia/Kolkata'], ['Currency', 'INR']];
    for (const card of CARDS) {
      rows.push([], [card.title]);
      const report = card.source ? reports[card.source] : undefined;
      if (report) rows.push(['Status', report.data_state || report.status], ['Reason', report.reason], ['Generated', report.generatedAt], ['Loaded rows', report.rows.length, 'Total rows', report.total], ...report.notes.map(note => [note]), report.columns, ...(card.social ? report.rows.filter(row => isSocialReferrer(row[0])) : report.rows));
      else rows.push([card.reason || (card.source && errors[card.source]) || 'Unavailable']);
    }
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `analytics-preview-${range.start}-${range.end}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const timestamps = Object.values(reports).map(report => report.generatedAt).filter(Boolean).sort();
  return <div className={styles.dashboard}>
    <header className={styles.header}><div><h1>Analytics</h1><p>INR · Asia/Kolkata{timestamps.length > 0 ? ` · Refreshed ${new Date(timestamps[timestamps.length - 1]).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}` : ''}</p></div>
      <form className={styles.controls} onSubmit={event => { event.preventDefault(); applyRange(draft.start, draft.end); }}>
        <label>Quick range<select aria-label="Quick range" defaultValue="" onChange={event => { if (event.target.value) applyRange(daysBefore(todayIST(), Number(event.target.value) - 1), todayIST()); event.target.value = ''; }}><option value="">Select period</option><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <label>From<input type="date" value={draft.start} max={todayIST()} onChange={event => setDraft({ ...draft, start: event.target.value })} required /></label>
        <label>Through<input type="date" value={draft.end} max={todayIST()} onChange={event => setDraft({ ...draft, end: event.target.value })} required /></label>
        <button type="submit"><RefreshCw size={14} />Refresh</button><button type="button" className={styles.primary} disabled={pending.length > 0 || !timestamps.length} onClick={exportCSV}><Download size={14} />Export preview CSV</button>
      </form></header>
    {validation && <p className={styles.error} role="alert">{validation}</p>}
    <div className={styles.notice}>Showing {range.start} through {range.end}. Sales use qualifying paid orders, excluding cancelled and refunded orders; they are not settlement revenue. Traffic covers consented observations only. Missing sources are shown as unavailable, never estimated. {pending.length ? `${pending.length} reports loading…` : `${Object.keys(reports).length} reports loaded${Object.keys(errors).length ? `; ${Object.keys(errors).length} failed — use Refresh to retry` : ''}.`}</div>
    <div className={styles.grid}>{CARDS.map(card => <AnalyticsCard key={`${card.title}:${range.start}:${range.end}:${refresh}`} card={card} report={card.source ? reports[card.source] : undefined} error={card.source ? errors[card.source] : undefined} pending={!!card.source && pending.includes(card.source)} />)}</div>
    <p className={styles.footer}>Dashboard exports contain loaded preview rows. For full report exports, integration status and detailed records, open <Link href="/reports">Reports</Link>. No Shopify connection is required.</p>
  </div>;
}
