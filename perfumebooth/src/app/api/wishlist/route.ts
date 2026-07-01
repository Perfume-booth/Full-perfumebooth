import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/lib/shopify/customer";
import { shopifyAdminFetch } from "@/lib/shopify/admin-fetcher";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { items } = body;
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const customerAccessToken = cookieStore.get("customerAccessToken")?.value;

    if (!customerAccessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get Customer ID from Token
    const customer = await getCustomer(customerAccessToken);
    if (!customer || !customer.id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 2. Update Metafield via Admin API
    const wishlistJson = JSON.stringify(items);
    
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          namespace: "custom",
          key: "wishlist",
          type: "json",
          value: wishlistJson,
          ownerId: customer.id
        }
      ]
    };

    const response = await shopifyAdminFetch<any>({
      query: mutation,
      variables
    });

    if (response.status === 403 || response.body.errors?.[0]?.extensions?.code === 'ACCESS_DENIED') {
      console.error("Wishlist sync error: Missing 'write_customers' scope.");
      return NextResponse.json({ 
        error: "Access Denied: Your Shopify Admin Token needs the 'write_customers' scope to save wishlists." 
      }, { status: 403 });
    }

    if (response.body.errors || response.body.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Wishlist sync error:", response.body.errors || response.body.data?.metafieldsSet?.userErrors);
      return NextResponse.json({ error: "Failed to sync wishlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Wishlist POST API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", details: error.toString() }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const customerAccessToken = cookieStore.get("customerAccessToken")?.value;

    if (!customerAccessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await getCustomer(customerAccessToken);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const wishlistData = customer.wishlist?.value ? JSON.parse(customer.wishlist.value) : [];

    return NextResponse.json({ items: wishlistData });
  } catch (error: any) {
    console.error("Wishlist GET API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", details: error.toString() }, 
      { status: 500 }
    );
  }
}
