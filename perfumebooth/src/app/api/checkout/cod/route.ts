import { NextResponse } from 'next/server';
import { shopifyAdminFetch } from '@/lib/shopify/admin-fetcher';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, form, financialStatus, couponCode, discountAmount, shippingRate } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
    }

    // Convert items from frontend useCartStore format to Shopify Admin GraphQL format
    const lineItems = items.map((item: any) => ({
      variantId: item.selectedVariantId || item.merchandise?.id, 
      quantity: item.cartQuantity || item.quantity,
    }));

    const query = `
      mutation orderCreate($order: OrderCreateOrderInput!) {
        orderCreate(order: $order, options: { sendReceipt: true }) {
          order {
            id
            name
            displayFinancialStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const address = {
      firstName: form.firstName,
      lastName: form.lastName,
      address1: form.address1,
      address2: form.address2,
      city: form.city,
      province: form.state,
      zip: form.zip,
      countryCode: "IN",
      phone: form.phone
    };

    const parsedDiscountAmount = parseFloat(discountAmount || '0');
    
    // Fallback default shipping rate if none passed
    const selectedRate = shippingRate || { title: "Complimentary Standard Shipping", amount: 0 };

    const orderInput: any = {
      lineItems,
      email: form.email,
      phone: form.phone,
      shippingAddress: address,
      billingAddress: address,
      financialStatus: financialStatus || "PENDING", 
      tags: ["Cash On Delivery", "Custom Checkout"],
      shippingLines: [
        {
          title: selectedRate.title,
          priceSet: {
            shopMoney: {
              amount: String(parseFloat(String(selectedRate.amount)).toFixed(2)),
              currencyCode: "INR"
            }
          }
        }
      ]
    };

    if (couponCode && parsedDiscountAmount > 0) {
      orderInput.discountCode = {
        itemFixedDiscountCode: {
          code: couponCode.trim(),
          amountSet: {
            shopMoney: {
              amount: String(parsedDiscountAmount.toFixed(2)),
              currencyCode: "INR"
            }
          }
        }
      };
    }

    const variables = {
      order: orderInput
    };

    const res = await shopifyAdminFetch<any>({ query, variables });

    if (res.body.errors || (res.body.data?.orderCreate?.userErrors && res.body.data.orderCreate.userErrors.length > 0)) {
      console.error("Shopify Order Create Error:", res.body.errors || res.body.data.orderCreate.userErrors);
      return NextResponse.json({ success: false, message: "Failed to create order in Shopify", errors: res.body.errors || res.body.data.orderCreate.userErrors }, { status: 400 });
    }

    const order = res.body.data.orderCreate.order;
    return NextResponse.json({ success: true, orderId: order.id, orderName: order.name });

  } catch (error: any) {
    console.error("COD Checkout Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
