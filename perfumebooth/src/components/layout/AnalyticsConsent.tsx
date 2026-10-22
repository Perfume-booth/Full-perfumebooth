'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { GoogleAnalytics } from '@next/third-parties/google';
import { analyticsAllowed, consentChoice, consentEvent, setAnalyticsConsent, trackFirstParty } from '@/lib/first-party-analytics';

let documentPath = '';
const revisions = new Map<string, number>();
const reportVital: Parameters<typeof useReportWebVitals>[0] = metric => {
  if (!['LCP', 'INP', 'CLS'].includes(metric.name)) return;
  const path = documentPath || '/';
  const revision = (revisions.get(metric.id) || 0) + 1;
  revisions.set(metric.id, revision);
  trackFirstParty('web_vital', { metric: metric.name, metric_id: metric.id, value: metric.value,
    metric_revision: revision,
    page_type: path.startsWith('/products/') ? 'product' : path === '/' ? 'home' : path.startsWith('/checkout') ? 'checkout' : 'other' }, path);
};
function Vitals() { useReportWebVitals(reportVital); return null; }

export default function AnalyticsConsent() {
  const [allowed, setAllowed] = useState(false);
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    documentPath ||= location.pathname;
    const update = () => { setAllowed(analyticsAllowed()); setShow(!consentChoice()); };
    update();
    window.addEventListener(consentEvent, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(consentEvent, update); window.removeEventListener('storage', update); };
  }, []);
  useEffect(() => {
    if (!allowed) return;
    const params = new URLSearchParams(location.search);
    trackFirstParty('page_view', { referrer: document.referrer ? new URL(document.referrer).origin.slice(0, 150) : '',
      device: matchMedia('(pointer:coarse)').matches ? 'touch' : 'desktop',
      utm_source: (params.get('utm_source') || '').slice(0, 150),
      utm_medium: (params.get('utm_medium') || '').slice(0, 150),
      utm_campaign: (params.get('utm_campaign') || '').slice(0, 150) });
  }, [allowed, pathname]);
  if (process.env.NEXT_PUBLIC_FIRST_PARTY_ANALYTICS_ENABLED !== 'true') return null;
  function choose(value: boolean) {
    setAnalyticsConsent(value);
    setShow(false);
    // A reload removes previously loaded third-party scripts after withdrawal.
    if (!value && allowed) window.location.reload();
  }
  return <>
    {allowed && <Vitals />}
    {allowed && process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    <button type="button" onClick={() => setShow(true)} className="fixed bottom-2 left-2 z-40 rounded bg-white px-3 py-2 text-xs text-black shadow">Privacy choices</button>
    {show && <section aria-label="Analytics privacy choices" className="fixed bottom-14 left-4 right-4 z-50 max-w-lg rounded-xl bg-white p-5 text-black shadow-xl border">
      <h2 className="font-semibold">Optional analytics</h2>
      <p className="my-3 text-sm">Allow us to measure browsing, searches and site performance? Analytics is optional. If configured, Google Analytics also receives usage events. We do not send your payment or contact details.</p>
      <div className="flex gap-3"><button className="border rounded px-4 py-2" onClick={() => choose(false)}>Reject analytics</button><button className="border rounded px-4 py-2" onClick={() => choose(true)}>Allow analytics</button></div>
    </section>}
  </>;
}
