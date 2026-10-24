import { apiFetch } from '@/lib/api';

export type Cell = string | number | null;
export interface Report {
  id: string; status: string; reason: string; data_state?: string;
  columns: string[]; rows: Cell[][]; notes: string[]; total: number; generatedAt: string;
}
export interface CardSpec {
  title: string; source?: string; kind?: 'line' | 'bars' | 'donut' | 'table' | 'breakdown' | 'count' | 'cohorts';
  label?: number; value?: number; wide?: boolean; reason?: string; note?: string; social?: boolean;
}
export const CARDS: CardSpec[] = [
  { title: 'Total sales by order', source: 'sales-orders', kind: 'table', wide: true },
  { title: 'Orders', source: 'orders-status', kind: 'count', value: 1 },
  { title: 'Orders fulfilled', reason: 'Full-order fulfillment requires item-level completion across all split shipments. Shipment counts are not fulfilled-order counts.' },
  { title: 'Gross sales', source: 'finance-summary', kind: 'count', value: 2, note: 'Stored gross subtotal of qualifying paid orders; not compare-at prices.' },
  { title: 'Returning customer rate over time', source: 'customers-time', kind: 'line', value: 3, note: 'Daily returning purchasers / all qualifying purchasers. Not a period-wide unique-customer rate.' },
  { title: 'Total sales breakdown', source: 'finance-summary', kind: 'breakdown' },
  { title: 'Total sales over time', source: 'sales-time', kind: 'line', value: 6, wide: true },
  { title: 'Total sales by product', source: 'sales-products', kind: 'bars', label: 1, value: 3, note: 'Gross merchandise before order discounts, tax and shipping.' },
  { title: 'Total sales by sales channel', reason: 'Historical sales-channel snapshots are not recorded on orders. Orders cannot safely be assigned to a channel retroactively.' },
  { title: 'Average order value over time', source: 'sales-averages', kind: 'line', value: 2 },
  { title: 'Conversion rate breakdown', source: 'conversion', kind: 'bars', value: 1, note: 'Independent stage-reach counts, not a sequential funnel. Purchases are verified by Django.' },
  { title: 'Sessions over time', source: 'sessions-time', kind: 'line', value: 1 },
  { title: 'Conversion rate over time', source: 'conversion-time', kind: 'line', value: 3, note: 'Observed daily session cohorts with a later qualifying paid order; not all visitors.' },
  { title: 'Total sales by social referrer', source: 'sales-referrer', kind: 'bars', value: 2, social: true },
  { title: 'Sessions by device type', source: 'sessions-device', kind: 'donut', value: 1 },
  { title: 'Sessions by location', source: 'sessions-location', kind: 'bars', value: 1 },
  { title: 'Sessions by landing page', source: 'sessions-landing', kind: 'bars', value: 1 },
  { title: 'Sessions by social referrer', source: 'sessions-referrer', kind: 'bars', value: 1, social: true, note: 'Recognized social referrer hosts only; not campaign attribution.' },
  { title: 'Sales attributed to marketing', source: 'campaigns', kind: 'table', wide: true },
  { title: 'Customer cohort analysis', source: 'customers-cohorts', kind: 'cohorts', wide: true },
  { title: 'Products by sell-through rate', source: 'stock-sell-through', kind: 'table' },
  { title: 'Sessions by referrer', source: 'sessions-referrer', kind: 'bars', value: 1 },
  { title: 'Total sales by referrer', source: 'sales-referrer', kind: 'bars', value: 2 },
  { title: 'POS staff sales total', reason: 'Not configured: this store has no POS staff sales ledger.' },
  { title: 'Total sales by POS location', reason: 'Not configured: this store has no POS location sales ledger.' },
];
export const SOURCES = [...new Set(CARDS.flatMap(card => card.source ? [card.source] : []))];
export function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function daysBefore(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function isSocialReferrer(value: Cell) {
  try {
    const host = new URL(String(value).includes('://') ? String(value) : `https://${value}`).hostname.toLowerCase();
    return ['facebook.com', 'instagram.com', 't.co', 'twitter.com', 'x.com', 'pinterest.com', 'linkedin.com', 'youtube.com', 'tiktok.com'].some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch { return false; }
}
export function unavailable(report?: Report) {
  if (!report) return '';
  if (report.status !== 'available') return report.reason || 'This report needs a data source.';
  const messages: Record<string, string> = {
    disabled: 'First-party analytics is disabled. Enable consent-aware tracking to collect observations.',
    awaiting_data: 'Awaiting recorded data. Historical activity will not be estimated.',
    needs_credentials: 'Connect the required provider credentials to load this report.',
    sync_failed: 'The provider sync failed. Check the analytics integration status.',
  };
  return messages[report.data_state || ''] || '';
}
export async function loadReport(source: string, start: string, end: string, signal: AbortSignal): Promise<Report> {
  const query = new URLSearchParams({ start, end, page_size: '200' });
  const first = await apiFetch<Report>(`/shop/reports/${source}/?${query}`, { signal });
  if (!first || !Array.isArray(first.rows) || !Array.isArray(first.columns) || !Array.isArray(first.notes)) throw new Error('Invalid report response. Ensure the current Django backend is running.');
  // Daily charts must not silently lose the last months of a long range.
  if (['sales-time', 'sales-averages', 'customers-time', 'sessions-time', 'conversion-time'].includes(source) && first.total > first.rows.length) {
    const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / 200) - 1 }, (_, index) => apiFetch<Report>(`/shop/reports/${source}/?${query}&page=${index + 2}`, { signal })));
    return { ...first, rows: [...first.rows, ...pages.flatMap(page => page.rows)] };
  }
  return first;
}
export function csvCell(value: Cell) {
  let text = String(value ?? '');
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
