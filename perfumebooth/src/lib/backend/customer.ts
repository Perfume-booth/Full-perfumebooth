const MOCK_CUSTOMER = {
  id: "gid://shopify/Customer/123456789",
  firstName: "Guest",
  lastName: "User",
  email: "guest@example.com",
  createdAt: new Date().toISOString(),
  phone: "+919999999999",
  tags: ["gender_men"],
  gender: { value: "men" },
  addresses: { edges: [] as any[] },
  orders: { edges: [] as any[] },
  defaultAddress: {
    id: "gid://shopify/MailingAddress/123",
    firstName: "Guest",
    lastName: "User",
    address1: "123 Perfume Lane",
    address2: "Suite 400",
    city: "New Delhi",
    province: "Delhi",
    zip: "110001",
    country: "India",
    phone: "9999999999"
  }
};

export async function getCustomer(token: string, cachePolicy?: any) {
  return MOCK_CUSTOMER;
}

export async function updateCustomer(token: string, input: any) {
  return { customer: MOCK_CUSTOMER, customerUserErrors: [] as any[] };
}

export async function createCustomerAddress(token: string, address: any) {
  return { customerAddress: { id: "addr-1" }, customerUserErrors: [] as any[] };
}

export async function updateCustomerAddress(token: string, addressId: string, address: any) {
  return { customerAddress: { id: addressId }, customerUserErrors: [] as any[] };
}

export async function deleteCustomerAddress(token: string, addressId: string) {
  return { deletedCustomerAddressId: addressId, customerUserErrors: [] as any[] };
}

export async function updateDefaultAddress(token: string, addressId: string) {
  return { customer: MOCK_CUSTOMER, customerUserErrors: [] as any[] };
}
