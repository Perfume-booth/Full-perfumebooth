import { sendGAEvent } from '@next/third-parties/google';
import type { Product } from '@/types/product';
import { analyticsAllowed, trackFirstParty } from './first-party-analytics';
const sendGTMEvent = (data: { event: string; ecommerce: Record<string, unknown> }) => {
  if (analyticsAllowed() && process.env.NEXT_PUBLIC_GA_ID) sendGAEvent('event', data.event, data.ecommerce);
};

// Map database product to GA4 E-commerce Item format
const mapProductToGA4Item = (product: any, quantity: number = 1) => {
  const price = product.price ? parseFloat(String(product.price)) : 0;
  
  // Extract brand from tags or brand/vendor properties
  let brand = product.brand || product.vendor || '';
  if (!brand && Array.isArray(product.tags)) {
    const brandTag = product.tags.find((t: string) => 
      t.toLowerCase().startsWith('brand:')
    );
    if (brandTag) {
      brand = brandTag.split(':')[1]?.trim();
    }
  }

  return {
    item_id: String(product.id),
    item_name: product.title,
    price: price,
    quantity: quantity,
    item_brand: brand || undefined,
    item_category: product.productType || undefined,
  };
};

/**
 * Track view_item_list (Product Listing Page)
 */
export const trackViewItemList = (products: Product[], collectionTitle?: string) => {
  if (!analyticsAllowed()) return;
  trackFirstParty('view_item_list');
  if (!products || products.length === 0) return;
  try {
    sendGTMEvent({
      event: 'view_item_list',
      ecommerce: {
        item_list_name: collectionTitle || 'Collection Grid',
        items: products.map((prod, idx) => ({
          ...mapProductToGA4Item(prod),
          index: idx + 1,
        })),
      },
    });
  } catch (err) {
    console.error('Error tracking view_item_list:', err);
  }
};

/**
 * Track view_item (Product Details Page)
 */
export const trackViewItem = (product: Product) => {
  if (!analyticsAllowed()) return;
  if (product) trackFirstParty('view_item', { product_id: String(product.id) });
  if (!product) return;
  try {
    sendGTMEvent({
      event: 'view_item',
      ecommerce: {
        value: product.price ? parseFloat(String(product.price)) : 0,
        currency: 'INR',
        items: [mapProductToGA4Item(product)],
      },
    });
  } catch (err) {
    console.error('Error tracking view_item:', err);
  }
};

/**
 * Track add_to_cart (Button Click)
 */
export const trackAddToCart = (product: Product, quantity: number = 1) => {
  if (!analyticsAllowed()) return;
  if (product) trackFirstParty('add_to_cart', { product_id: String(product.id), quantity });
  if (!product) return;
  try {
    const item = mapProductToGA4Item(product, quantity);
    sendGTMEvent({
      event: 'add_to_cart',
      ecommerce: {
        value: item.price * quantity,
        currency: 'INR',
        items: [item],
      },
    });
  } catch (err) {
    console.error('Error tracking add_to_cart:', err);
  }
};

/**
 * Track begin_checkout (Checkout Page Start)
 */
export const trackBeginCheckout = (items: any[], total: number) => {
  if (!analyticsAllowed()) return;
  trackFirstParty('begin_checkout');
  if (!items || items.length === 0) return;
  try {
    sendGTMEvent({
      event: 'begin_checkout',
      ecommerce: {
        value: total,
        currency: 'INR',
        items: items.map((item) => mapProductToGA4Item(item, item.cartQuantity || 1)),
      },
    });
  } catch (err) {
    console.error('Error tracking begin_checkout:', err);
  }
};

/**
 * Track purchase (Order Confirmation / Thank You Page)
 */
export const trackPurchase = (
  orderId: string,
  items: any[],
  total: number,
  coupon?: string
) => {
  // The thank-you page is not proof of payment. Purchases are derived from Django.
  return;
};
