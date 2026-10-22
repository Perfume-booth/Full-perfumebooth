import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_FIRST_PARTY_ANALYTICS_ENABLED !== 'true' || !process.env.ANALYTICS_INGEST_KEY) return new NextResponse(null, { status: 503 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`analytics:${ip}`, 120, 60000)) return new NextResponse(null, { status: 429 });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 400 });
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
      chunks.push(chunk.value);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    const sessionId = String(JSON.parse(body).session_id || '').slice(0, 36);
    const base = process.env.DJANGO_API_URL || process.env.BACKEND_API_URL
      || (existsSync('/.dockerenv') ? 'http://django:8000' : 'http://localhost:8000');
    const response = await fetch(`${base.replace(/\/$/, '')}/api/shop/events/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Analytics-Key': process.env.ANALYTICS_INGEST_KEY, 'X-Analytics-Session': sessionId }, body,
      cache: 'no-store', signal: AbortSignal.timeout(4000),
    });
    const envelope = await response.json();
    return NextResponse.json(envelope.data || envelope, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new NextResponse(null, { status: 503 }); }
}
