import { unwrapApiData, ensureArray } from './types';

const isServer = typeof window === 'undefined';
const isDocker = process.env.WATCHPACK_POLLING === "true";
const API_URL = isServer ? (isDocker ? 'http://django:8000' : 'http://localhost:8000') : 'http://localhost:8000';

export async function getCustomer(token: string) {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/me/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const rawData = await res.json();
    const data = unwrapApiData(rawData) || {};
    
    const addresses = (data.addresses || []).map((addr: any) => ({
      node: {
        id: addr.id,
        firstName: addr.first_name,
        lastName: addr.last_name,
        address1: addr.address1,
        address2: addr.address2,
        city: addr.city,
        province: addr.province,
        country: addr.country,
        zip: addr.zip,
        phone: addr.phone,
        isDefault: addr.is_default
      }
    }));

    const defaultAddressNode = addresses.find((a: any) => a.node.isDefault) || addresses[0] || null;

    return {
      id: data.id,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      addresses: { edges: addresses },
      defaultAddress: defaultAddressNode ? defaultAddressNode.node : null
    };
  } catch (err) {
    console.error("getCustomer error:", err);
    return null;
  }
}

function mapOrder(order: any) {
  if (!order) return null;
  const status = String(order.status || "Pending").toUpperCase();
  const shippingAddress = order.shipping_address || {};
  const items = order.items || [];
  return {
    id: String(order.id),
    name: order.order_number,
    processedAt: order.created_at,
    cancelledAt: status === "CANCELLED" ? order.updated_at || order.created_at : null,
    cancelReason: status === "CANCELLED" ? "Cancelled" : null,
    financialStatus: status === "PAID" || status === "SHIPPED" || status === "DELIVERED" ? "PAID" : "PENDING",
    fulfillmentStatus: status === "DELIVERED" ? "FULFILLED" : status === "SHIPPED" ? "IN_PROGRESS" : status,
    subtotalPrice: { amount: String(order.subtotal || order.total || 0), currencyCode: "INR" },
    totalPrice: { amount: String(order.total || 0), currencyCode: "INR" },
    totalShipping: String(shippingAddress.shipping_cost || 0),
    totalDiscounts: String(order.discount_amount || 0),
    shippingAddress: {
      firstName: shippingAddress.firstName || shippingAddress.first_name || "",
      lastName: shippingAddress.lastName || shippingAddress.last_name || "",
      address1: shippingAddress.address1 || "",
      address2: shippingAddress.address2 || "",
      city: shippingAddress.city || "",
      province: shippingAddress.state || shippingAddress.province || "",
      zip: shippingAddress.zip || "",
      phone: shippingAddress.phone || "",
    },
    email: shippingAddress.email || order.customer_email || "",
    trackingUrl: order.tracking_url,
    awb: order.awb_code,
    courierName: order.courier_name,
    lineItems: {
      edges: items.map((item: any) => ({
        node: {
          id: String(item.id),
          title: item.product_title,
          quantity: item.quantity,
          variant: {
            title: item.product_title,
            image: item.product_image ? { url: item.product_image, altText: item.product_title } : null,
            price: { amount: String(item.unit_price || 0), currencyCode: "INR" },
          },
          originalTotalPrice: { amount: String(item.line_total || 0), currencyCode: "INR" },
        },
      })),
    },
    metafields: [],
  };
}

export async function getCustomerOrders(token: string) {
  const response = await fetch(`${API_URL}/api/orders/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const rawOrders = await response.json();
  const orders = ensureArray(rawOrders);
  return orders.map(mapOrder).filter(Boolean);
}

export async function getCustomerOrder(token: string, orderId: string) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rawOrder = await response.json();
  return mapOrder(unwrapApiData(rawOrder));
}

export async function updateCustomer(token: string, input: any) {
  if (!token) return { customer: null, customerUserErrors: [{ message: "Not authenticated" }] };
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/me/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      const errData = await res.json();
      return { customer: null, customerUserErrors: [{ message: errData.detail || "Failed to update profile" }] };
    }
    const customer = await getCustomer(token);
    return { customer, customerUserErrors: [] };
  } catch (err: any) {
    return { customer: null, customerUserErrors: [{ message: err.message || "Server error" }] };
  }
}

export async function createCustomerAddress(token: string, address: any) {
  if (!token) return { customerAddress: null, customerUserErrors: [{ message: "Not authenticated" }] };
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/addresses/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: address.firstName,
        last_name: address.lastName,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province || address.state,
        country: address.country || 'India',
        zip: address.zip || address.pincode,
        phone: address.phone
      })
    });
    if (!res.ok) {
      const errData = await res.json();
      return { customerAddress: null, customerUserErrors: [{ message: errData.detail || "Failed to add address" }] };
    }
    const rawData = await res.json();
    const data = unwrapApiData(rawData);
    return { customerAddress: data, customerUserErrors: [] };
  } catch (err: any) {
    return { customerAddress: null, customerUserErrors: [{ message: err.message || "Server error" }] };
  }
}

export async function updateCustomerAddress(token: string, addressId: string, address: any) {
  if (!token) return { customerAddress: null, customerUserErrors: [{ message: "Not authenticated" }] };
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/addresses/${addressId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: address.firstName,
        last_name: address.lastName,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province || address.state,
        country: address.country || 'India',
        zip: address.zip || address.pincode,
        phone: address.phone
      })
    });
    if (!res.ok) {
      const errData = await res.json();
      return { customerAddress: null, customerUserErrors: [{ message: errData.detail || "Failed to update address" }] };
    }
    const rawData = await res.json();
    const data = unwrapApiData(rawData);
    return { customerAddress: data, customerUserErrors: [] };
  } catch (err: any) {
    return { customerAddress: null, customerUserErrors: [{ message: err.message || "Server error" }] };
  }
}

export async function deleteCustomerAddress(token: string, addressId: string) {
  if (!token) return { deletedCustomerAddressId: null, customerUserErrors: [{ message: "Not authenticated" }] };
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/addresses/${addressId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      return { deletedCustomerAddressId: null, customerUserErrors: [{ message: "Failed to delete address" }] };
    }
    return { deletedCustomerAddressId: addressId, customerUserErrors: [] };
  } catch (err: any) {
    return { deletedCustomerAddressId: null, customerUserErrors: [{ message: err.message || "Server error" }] };
  }
}

export async function updateDefaultAddress(token: string, addressId: string) {
  if (!token) return { customer: null, customerUserErrors: [{ message: "Not authenticated" }] };
  try {
    const res = await fetch(`${API_URL}/api/auth/customer/addresses/${addressId}/set-default/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      return { customer: null, customerUserErrors: [{ message: "Failed to update default address" }] };
    }
    const customer = await getCustomer(token);
    return { customer, customerUserErrors: [] };
  } catch (err: any) {
    return { customer: null, customerUserErrors: [{ message: err.message || "Server error" }] };
  }
}
