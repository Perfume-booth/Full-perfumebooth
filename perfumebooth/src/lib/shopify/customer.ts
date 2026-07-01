import { 
  customerCreateMutation,
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerRecoverMutation,
  customerResetByUrlMutation,
  customerUpdateMutation,
  customerAddressCreateMutation,
  customerAddressUpdateMutation,
  customerAddressDeleteMutation,
  customerDefaultAddressUpdateMutation,
  getCustomerQuery
} from '../queries';
import { shopifyFetch } from './fetcher';

export async function getCustomer(customerAccessToken: string, cache: RequestCache = "no-store") {
  const { body } = await shopifyFetch<any>({
    query: getCustomerQuery,
    variables: { customerAccessToken },
    cache,
  });
  return body?.data?.customer || null;
}

export async function createCustomer(input: any) {
  const { body } = await shopifyFetch<any>({
    query: customerCreateMutation,
    variables: { input },
  });
  return body.data?.customerCreate || null;
}

export async function createAccessToken(input: any) {
  const { body } = await shopifyFetch<any>({
    query: customerAccessTokenCreateMutation,
    variables: { input },
  });
  return body.data?.customerAccessTokenCreate || null;
}

export async function deleteAccessToken(customerAccessToken: string) {
  const { body } = await shopifyFetch<any>({
    query: customerAccessTokenDeleteMutation,
    variables: { customerAccessToken },
  });
  return body.data?.customerAccessTokenDelete || null;
}

export async function recoverPassword(email: string) {
  const { body } = await shopifyFetch<any>({
    query: customerRecoverMutation,
    variables: { email },
  });
  return body.data?.customerRecover || null;
}

export async function resetPassword(resetUrl: string, password: string) {
  const { body } = await shopifyFetch<any>({
    query: customerResetByUrlMutation,
    variables: { resetUrl, password },
  });
  if (body?.errors && body.errors.length > 0) {
    console.error("Shopify customerResetByUrl GraphQL Errors:", JSON.stringify(body.errors, null, 2));
    throw new Error(body.errors[0]?.message || "GraphQL error during password reset.");
  }
  return body?.data?.customerResetByUrl || null;
}

export async function updateCustomer(customerAccessToken: string, customer: any) {
  const { body } = await shopifyFetch<any>({
    query: customerUpdateMutation,
    variables: { customerAccessToken, customer }
  });
  return body.data?.customerUpdate;
}

export async function createCustomerAddress(customerAccessToken: string, address: any) {
  const { body } = await shopifyFetch<any>({
    query: customerAddressCreateMutation,
    variables: { customerAccessToken, address }
  });
  return body.data?.customerAddressCreate;
}

export async function updateCustomerAddress(customerAccessToken: string, id: string, address: any) {
  const { body } = await shopifyFetch<any>({
    query: customerAddressUpdateMutation,
    variables: { customerAccessToken, id, address }
  });
  return body.data?.customerAddressUpdate;
}

export async function deleteCustomerAddress(customerAccessToken: string, id: string) {
  const { body } = await shopifyFetch<any>({
    query: customerAddressDeleteMutation,
    variables: { customerAccessToken, id }
  });
  return body.data?.customerAddressDelete;
}

export async function updateDefaultAddress(customerAccessToken: string, addressId: string) {
  const { body } = await shopifyFetch<any>({
    query: customerDefaultAddressUpdateMutation,
    variables: { customerAccessToken, addressId }
  });
  return body.data?.customerDefaultAddressUpdate;
}
