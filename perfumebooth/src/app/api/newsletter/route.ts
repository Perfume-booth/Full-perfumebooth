import { NextRequest, NextResponse } from 'next/server';
import { readJsonDb, appendToJsonDb } from '@/lib/json-db';
import { getCustomer } from '@/lib/shopify';
import { shopifyAdminFetch } from '@/lib/shopify/admin-fetcher';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UPDATE_CUSTOMER_SUBSCRIBED = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // 1. Save to JSON DB (for tracking all signups)
    const subscribers = await readJsonDb<any>('subscribers.json');
    if (!subscribers.some((s: any) => s.email.toLowerCase() === email.toLowerCase())) {
        const newSubscriber = {
            email: email.toLowerCase(),
            subscribedAt: new Date().toISOString()
        };
        await appendToJsonDb('subscribers.json', newSubscriber);
    }

    // 2. If logged in, update Shopify Customer Metafield
    const token = req.cookies.get('customerAccessToken')?.value;
    if (token) {
        const customer = await getCustomer(token);
        if (customer && customer.id) {
            await shopifyAdminFetch({
                query: UPDATE_CUSTOMER_SUBSCRIBED,
                variables: {
                    input: {
                        id: customer.id,
                        metafields: [
                            {
                                namespace: "custom",
                                key: "is_subscribed",
                                value: "true",
                                type: "boolean"
                            }
                        ]
                    }
                }
            });
        }
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Newsletter API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

