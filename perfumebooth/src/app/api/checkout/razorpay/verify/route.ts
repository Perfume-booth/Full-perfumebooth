import { paymentProxy } from '@/lib/payment-proxy';

export async function POST(request: Request) {
  return paymentProxy(request, 'verify');
}
