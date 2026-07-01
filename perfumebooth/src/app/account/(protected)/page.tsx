import { requireCustomer } from "@/lib/actions/auth";
import AccountClient from "../AccountClient";

export default async function AccountPage() {
  const customer = await requireCustomer();

  return <AccountClient customer={customer} />;
}
