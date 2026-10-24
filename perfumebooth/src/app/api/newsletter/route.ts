import { NextRequest } from 'next/server';
import { notificationProxy } from '@/lib/notification-proxy';

export async function POST(req: NextRequest) {
  return notificationProxy(req, 'newsletter/subscribe');
}



