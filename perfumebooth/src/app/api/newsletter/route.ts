import { NextRequest, NextResponse } from 'next/server';
import { readJsonDb, appendToJsonDb } from '@/lib/json-db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Persist subscriber durably in Django PostgreSQL database
    const isDocker = process.env.WATCHPACK_POLLING === "true";
    const API_URL = process.env.NEXT_PUBLIC_API_URL || (isDocker ? "http://django:8000" : "http://localhost:8000");

    const backendRes = await fetch(`${API_URL}/api/cms/newsletter/subscribe/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase(), source: "website_footer" }),
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || errData.detail || 'Subscription failed.' },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Newsletter API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


