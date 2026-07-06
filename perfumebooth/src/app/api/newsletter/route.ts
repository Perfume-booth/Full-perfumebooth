import { NextRequest, NextResponse } from 'next/server';
import { readJsonDb, appendToJsonDb } from '@/lib/json-db';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Save to JSON DB (for tracking all signups)
    const subscribers = await readJsonDb<any>('subscribers.json');
    if (!subscribers.some((s: any) => s.email.toLowerCase() === email.toLowerCase())) {
        const newSubscriber = {
            email: email.toLowerCase(),
            subscribedAt: new Date().toISOString()
        };
        await appendToJsonDb('subscribers.json', newSubscriber);
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Newsletter API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


