'use client';

import React, { useState } from 'react';
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  Cell as PieCell, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { 
  Loader2, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  BarChart2,
  Table as TableIcon
} from 'lucide-react';
import { CardSpec, Cell, Report, isSocialReferrer, unavailable } from './dashboard-data';

const COLORS = ['#9333ea', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

function display(value: Cell) {
  return value === null
    ? '—'
    : typeof value === 'number'
    ? value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : value;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-card neu-extruded p-3 rounded-2xl border border-border/20 text-xs font-black shadow-2xl">
        <p className="text-muted-foreground mb-1 text-[11px] font-bold">{label}</p>
        <p className="text-foreground">
          {payload[0].name || 'Value'}:{' '}
          <span className="text-primary font-black">
            {typeof val === 'number' ? val.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : val}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

function ReportTable({ report }: { report: Report }) {
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, report.rows.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="neu-inset-sm rounded-2xl border border-border/20 overflow-hidden">
        <div className="overflow-x-auto max-h-[320px] scrollbar-thin">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground text-[10px] font-black uppercase tracking-wider sticky top-0 backdrop-blur-sm border-b border-border/20">
              <tr>
                {report.columns.map((column, i) => (
                  <th key={i} className="p-3 whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-bold text-foreground">
              {report.rows.slice(page * pageSize, (page + 1) * pageSize).map((row, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="p-3 max-w-[240px] truncate">
                      {display(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.rows.length > pageSize && (
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
          <button
            type="button"
            disabled={!page}
            onClick={() => setPage(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl neu-btn font-black text-xs text-foreground disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <span>
            {startRow}–{endRow} of {report.total}
          </span>
          <button
            type="button"
            disabled={(page + 1) * pageSize >= report.rows.length}
            onClick={() => setPage(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl neu-btn font-black text-xs text-foreground disabled:opacity-40 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Cohorts({ report }: { report: Report }) {
  const months = [...new Set(report.rows.map(row => Number(row[1])))].sort((a, b) => a - b);
  const cohorts = [...new Set(report.rows.map(row => String(row[0])))];
  const lookup = new Map(report.rows.map(row => [`${row[0]}:${row[1]}`, row]));

  return (
    <div className="neu-inset-sm rounded-2xl border border-border/20 overflow-hidden">
      <div className="overflow-x-auto max-h-[320px] scrollbar-thin">
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/60 text-muted-foreground text-[10px] font-black uppercase tracking-wider sticky top-0 backdrop-blur-sm border-b border-border/20">
            <tr>
              <th className="p-3">Cohort</th>
              <th className="p-3">Customers</th>
              {months.map(month => (
                <th key={month} className="p-3 whitespace-nowrap">
                  Month {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10 font-bold text-foreground">
            {cohorts.map(cohort => (
              <tr key={cohort} className="hover:bg-muted/20 transition-colors">
                <th className="p-3 font-black text-foreground">{cohort}</th>
                <td className="p-3 text-muted-foreground font-black">
                  {report.rows.find(row => row[0] === cohort)?.[2]}
                </td>
                {months.map(month => {
                  const row = lookup.get(`${cohort}:${month}`);
                  return (
                    <td
                      key={month}
                      className="p-3"
                      style={
                        row
                          ? {
                              background: `rgba(147, 51, 234, ${0.08 + (Number(row[4]) / 100) * 0.35})`,
                            }
                          : undefined
                      }
                    >
                      {row ? <span className="font-black text-foreground">{row[4]}%</span> : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Content({ card, report }: { card: CardSpec; report: Report }) {
  const rows = card.social ? report.rows.filter(row => isSocialReferrer(row[0])) : report.rows;
  if (!rows.length) {
    return (
      <div className="min-h-[140px] flex flex-col items-center justify-center p-6 text-center neu-inset-sm rounded-2xl border border-border/10 gap-1.5">
        <Info className="w-4 h-4 text-muted-foreground/60 mb-1" />
        <span className="text-xs font-black text-muted-foreground">No recorded data for this date range.</span>
      </div>
    );
  }

  const valueIndex = card.value ?? 1;
  const data = rows.map(row => ({
    name: String(row[card.label ?? 0] ?? 'Unknown'),
    value: row[valueIndex] === null ? null : Number(row[valueIndex]),
  }));

  if (card.kind === 'count') {
    const total = rows.reduce((sum, row) => sum + Number(row[valueIndex] ?? 0), 0);
    return (
      <div className="py-2">
        <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          {card.source === 'finance-summary'
            ? `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
            : total.toLocaleString('en-IN')}
        </span>
      </div>
    );
  }

  if (card.kind === 'breakdown') {
    const row = rows[0];
    const values: [string, Cell][] = [
      ['Gross subtotal', row[2]],
      ['Discounts', row[3]],
      ['Merchandise after discount', row[8]],
      ['Shipping charges', row[4]],
      ['Taxes', row[5]],
      ['Qualifying paid total', row[6]],
      ['Sales reversals', null],
      ['Return fees', null],
    ];
    return (
      <dl className="flex flex-col gap-2">
        {values.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between p-2.5 rounded-xl neu-inset-sm border border-border/10 text-xs font-bold"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-black text-foreground">
              {value === null
                ? 'Not available'
                : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (card.kind === 'line') {
    const gradId = `grad-${card.title.replace(/[^a-zA-Z0-9]/g, '-')}`;
    return (
      <div className="h-[210px] w-full pt-2" role="img" aria-label={card.title}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
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
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 10, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={48}
            />
            <Tooltip content={<CustomChartTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              name={report.columns[valueIndex] || 'Metric'}
              stroke="#9333ea"
              fill={`url(#${gradId})`}
              strokeWidth={2.5}
              isAnimationActive={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (card.kind === 'donut') {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="85%"
                isAnimationActive={false}
              >
                {data.map((item, i) => (
                  <PieCell key={item.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-black">
          {data.map((item, i) => (
            <span
              key={item.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl neu-inset-sm border border-border/10 text-foreground"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (card.kind === 'bars') {
    const ranked = card.source === 'conversion' ? data : [...data].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const max = Math.max(1, ...ranked.map(row => row.value ?? 0));
    return (
      <div className="space-y-3 py-1">
        {ranked.slice(0, 6).map((item, index) => (
          <div key={`${item.name}:${index}`} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-muted-foreground truncate max-w-[200px]" title={item.name}>
                {item.name.replaceAll('_', ' ')}
              </span>
              <strong className="text-foreground">{display(item.value)}</strong>
            </div>
            <div className="h-2 w-full neu-inset-sm rounded-full overflow-hidden bg-muted/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-purple-400 transition-all duration-500"
                style={{ width: `${Math.max(2, ((item.value ?? 0) / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] font-bold text-muted-foreground pt-1">
          {report.columns[valueIndex]}
          {ranked.length > 6 ? ' · Top 6 loaded rows shown' : ''}
        </p>
      </div>
    );
  }

  if (card.kind === 'cohorts') return <Cohorts report={report} />;
  return <ReportTable report={{ ...report, rows }} />;
}

export default function AnalyticsCard({
  card,
  report,
  error,
  pending,
}: {
  card: CardSpec;
  report?: Report;
  error?: string;
  pending: boolean;
}) {
  const reason = card.reason || unavailable(report);

  return (
    <section
      className={`bg-card neu-extruded p-6 rounded-3xl border border-border/10 flex flex-col justify-between gap-4 transition-all hover:border-border/30 ${
        card.wide ? 'col-span-1 lg:col-span-2' : 'col-span-1'
      }`}
      aria-label={card.title}
      aria-busy={!!card.source && pending}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/10 pb-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-black text-foreground tracking-tight">{card.title}</h3>
          {card.note && <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{card.note}</p>}
        </div>
        {card.source && (
          <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-xl neu-inset-sm text-primary border border-primary/20 shrink-0">
            {card.kind || 'metric'}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col justify-center">
        {card.reason ? (
          <div className="min-h-[140px] flex flex-col items-center justify-center p-5 text-center neu-inset-sm rounded-2xl border border-border/10 gap-1.5">
            <Info className="w-4 h-4 text-muted-foreground/60 mb-1" />
            <strong className="text-xs font-black text-foreground/80">Not Available</strong>
            <p className="text-[11px] font-bold text-muted-foreground max-w-xs">{reason}</p>
          </div>
        ) : pending ? (
          <div className="min-h-[140px] flex flex-col items-center justify-center p-6 text-center neu-inset-sm rounded-2xl border border-border/10 gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-xs font-black text-muted-foreground">Loading report data…</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-black flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : reason ? (
          <div className="min-h-[140px] flex flex-col items-center justify-center p-5 text-center neu-inset-sm rounded-2xl border border-border/10 gap-1.5">
            <Info className="w-4 h-4 text-muted-foreground/60 mb-1" />
            <strong className="text-xs font-black text-foreground/80">
              {report?.data_state === 'disabled' ? 'Tracking Disabled' : 'Awaiting Data Source'}
            </strong>
            <p className="text-[11px] font-bold text-muted-foreground max-w-xs">{reason}</p>
          </div>
        ) : report ? (
          <Content card={card} report={report} />
        ) : (
          <div className="min-h-[140px] flex flex-col items-center justify-center p-6 text-center neu-inset-sm rounded-2xl border border-border/10">
            <span className="text-xs font-black text-muted-foreground">Sign in to load this report.</span>
          </div>
        )}
      </div>

      {/* Card Footer / Definitions */}
      {report && !pending && !error && (
        <div className="pt-2 border-t border-border/10 flex flex-col gap-2">
          {report.total > report.rows.length && (
            <p className="text-[10px] font-bold text-muted-foreground">
              Preview: first {report.rows.length} of {report.total} rows. Open Reports for full data.
            </p>
          )}
          <details className="text-xs font-bold text-muted-foreground group">
            <summary className="cursor-pointer font-black text-foreground/80 hover:text-primary transition-colors flex items-center justify-between py-1">
              <span>Definitions & Data Breakdown</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="pt-2 space-y-2 text-[11px]">
              {report.notes.map(note => (
                <p key={note} className="text-muted-foreground leading-relaxed">
                  {note}
                </p>
              ))}
              {!reason && !['table', 'cohorts'].includes(card.kind || '') && report.rows.length > 0 && (
                <ReportTable
                  report={
                    card.social
                      ? {
                          ...report,
                          rows: report.rows.filter(row => isSocialReferrer(row[0])),
                          total: report.rows.filter(row => isSocialReferrer(row[0])).length,
                        }
                      : report
                  }
                />
              )}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
