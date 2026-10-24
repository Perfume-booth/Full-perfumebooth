'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell as PieCell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CardSpec, Cell, Report, isSocialReferrer, unavailable } from './dashboard-data';
import styles from './analytics.module.css';

const COLORS = ['#0ea5e9', '#6366f1', '#22c1b5', '#94a3b8', '#e5a13c'];
function display(value: Cell) { return value === null ? '—' : typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : value; }
function ReportTable({ report }: { report: Report }) {
  const [page, setPage] = useState(0);
  return <><div className={styles.tableScroll} tabIndex={0} aria-label="Report data"><table><thead><tr>{report.columns.map((column, i) => <th key={i}>{column}</th>)}</tr></thead><tbody>{report.rows.slice(page * 8, (page + 1) * 8).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{display(cell)}</td>)}</tr>)}</tbody></table></div>
    {report.rows.length > 8 && <div className={styles.pager}><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><span>{page * 8 + 1}–{Math.min((page + 1) * 8, report.rows.length)} of {report.total}</span><button disabled={(page + 1) * 8 >= report.rows.length} onClick={() => setPage(page + 1)}>Next</button></div>}</>;
}
function Cohorts({ report }: { report: Report }) {
  const months = [...new Set(report.rows.map(row => Number(row[1])))].sort((a, b) => a - b);
  const cohorts = [...new Set(report.rows.map(row => String(row[0])))];
  const lookup = new Map(report.rows.map(row => [`${row[0]}:${row[1]}`, row]));
  return <div className={styles.tableScroll} tabIndex={0} aria-label="Customer cohort heatmap"><table><thead><tr><th>Cohort</th><th>Customers</th>{months.map(month => <th key={month}>Month {month}</th>)}</tr></thead><tbody>{cohorts.map(cohort => <tr key={cohort}><th>{cohort}</th><td>{report.rows.find(row => row[0] === cohort)?.[2]}</td>{months.map(month => {
    const row = lookup.get(`${cohort}:${month}`);
    return <td key={month} style={row ? { background: `rgba(14,165,233,${0.06 + Number(row[4]) / 100 * 0.3})` } : undefined}>{row ? `${row[4]}%` : '—'}</td>;
  })}</tr>)}</tbody></table></div>;
}
function Content({ card, report }: { card: CardSpec; report: Report }) {
  const rows = card.social ? report.rows.filter(row => isSocialReferrer(row[0])) : report.rows;
  if (!rows.length) return <div className={styles.empty}>No recorded data for this date range.</div>;
  const valueIndex = card.value ?? 1;
  const data = rows.map(row => ({ name: String(row[card.label ?? 0] ?? 'Unknown'), value: row[valueIndex] === null ? null : Number(row[valueIndex]) }));
  if (card.kind === 'count') {
    const total = rows.reduce((sum, row) => sum + Number(row[valueIndex] ?? 0), 0);
    return <div className={styles.metric}>{card.source === 'finance-summary' ? `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : total.toLocaleString('en-IN')}</div>;
  }
  if (card.kind === 'breakdown') {
    const row = rows[0];
    const values: [string, Cell][] = [['Gross subtotal', row[2]], ['Discounts', row[3]], ['Merchandise after discount (before refunds)', row[8]], ['Shipping charges', row[4]], ['Taxes', row[5]], ['Qualifying paid total', row[6]], ['Sales reversals', null], ['Return fees', null]];
    return <dl className={styles.breakdown}>{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null ? 'Not available' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</dd></div>)}</dl>;
  }
  if (card.kind === 'line') return <div className={styles.chart} role="img" aria-label={`${card.title}. Exact values in data table below.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} minTickGap={35} axisLine={false} tickLine={false} /><YAxis width={48} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Area type="linear" dataKey="value" name={report.columns[valueIndex]} stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2} isAnimationActive={false} connectNulls={false} /></AreaChart></ResponsiveContainer></div>;
  if (card.kind === 'donut') return <><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" isAnimationActive={false}>{data.map((item, i) => <PieCell key={item.name} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className={styles.legend}>{data.map((item, i) => <span key={item.name}><i style={{ background: COLORS[i % COLORS.length] }} />{item.name}: {item.value}</span>)}</div></>;
  if (card.kind === 'bars') {
    const ranked = card.source === 'conversion' ? data : [...data].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const max = Math.max(1, ...ranked.map(row => row.value ?? 0));
    return <div className={styles.bars}>{ranked.slice(0, 6).map((item, index) => <div key={`${item.name}:${index}`}><div className={styles.barLabel}><span title={item.name}>{item.name.replaceAll('_', ' ')}</span><strong>{display(item.value)}</strong></div><div className={styles.track}><div style={{ width: `${Math.max(0, (item.value ?? 0) / max * 100)}%` }} /></div></div>)}<small>{report.columns[valueIndex]}{ranked.length > 6 ? ' · Top 6 loaded rows shown' : ''}</small></div>;
  }
  if (card.kind === 'cohorts') return <Cohorts report={report} />;
  return <ReportTable report={{ ...report, rows }} />;
}
export default function AnalyticsCard({ card, report, error, pending }: { card: CardSpec; report?: Report; error?: string; pending: boolean }) {
  const reason = card.reason || unavailable(report);
  return <section className={`${styles.card} ${card.wide ? styles.wide : ''}`} aria-label={card.title} aria-busy={!!card.source && pending}>
    <h2>{card.title}</h2>
    {card.reason ? <div className={styles.empty}><strong>Not available</strong><p>{reason}</p></div> : pending ? <div className={styles.empty} role="status">Loading report…</div> : error ? <div className={styles.error} role="alert">{error}</div> : reason ? <div className={styles.empty}><strong>{report?.data_state === 'disabled' ? 'Tracking disabled' : 'Awaiting data source'}</strong><p>{reason}</p></div> : report ? <Content card={card} report={report} /> : <div className={styles.empty}>Sign in to load this report.</div>}
    {card.note && <p className={styles.note}>{card.note}</p>}
    {report && !pending && !error && <>
      {report.total > report.rows.length && <p className={styles.note}>Preview: first {report.rows.length} of {report.total} rows. Open Reports for the full export. No totals are calculated from truncated rows.</p>}
      <details className={styles.details}><summary>Definitions &amp; data</summary>{report.notes.map(note => <p key={note}>{note}</p>)}{!reason && !['table', 'cohorts'].includes(card.kind || '') && report.rows.length > 0 && <ReportTable report={card.social ? { ...report, rows: report.rows.filter(row => isSocialReferrer(row[0])), total: report.rows.filter(row => isSocialReferrer(row[0])).length } : report} />}</details>
    </>}
  </section>;
}
