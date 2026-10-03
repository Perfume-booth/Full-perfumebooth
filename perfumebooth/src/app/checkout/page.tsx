import { cookies } from "next/headers";
import { getCustomer } from "@/lib/catalog";
import { redirect } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("customerAccessToken")?.value;
    
    if (!token) {
        redirect("/auth?returnUrl=/checkout");
    }

    let customer = null;
    if (token) {
        try {
            customer = await getCustomer(token);
        } catch (error) {
            console.error("Failed to fetch customer for checkout:", error);
        }
    }

    return <CheckoutClient customer={customer} />;
}
