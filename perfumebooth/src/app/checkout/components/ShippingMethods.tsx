"use client";

import { useEffect, useState } from "react";
import { useCartStore, ShippingRate } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { AnimatedLoader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedTruck } from "@/components/ui/icons/AnimatedTruck";

interface ShippingMethodsProps {
  form: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    email: string;
    phone: string;
  };
  cartId: string | null;
}

export default function ShippingMethods({ form, cartId }: ShippingMethodsProps) {
  const {
    availableShippingRates,
    selectedShippingRate,
    setShippingRates,
    setSelectedShippingRate,
    items,
    cartTotal,
    subtotalAmount
  } = useCartStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subtotal = subtotalAmount > 0 ? subtotalAmount : cartTotal();
  const isFreeEligible = subtotal >= 999;

  const hasPhysicalItems = items.some(item => item.requiresShipping);

  // Function to execute the query against our Serverless API
  const calculateRates = async () => {
    if (!hasPhysicalItems) return;
    if (!cartId) return;
    if (!form.zip || form.zip.trim().length < 5) {
      setErrorMsg("Please enter a valid PIN Code to calculate shipping.");
      return;
    }

    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/checkout/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartId,
          subtotal: subtotal,
          shippingAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            address1: form.address1 || "Temp Address",
            address2: form.address2 || "",
            city: form.city || "Delhi",
            state: form.state || "Delhi",
            zip: form.zip,
            country: form.country,
            email: form.email,
            phone: form.phone
          }
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.shippingRates?.length > 0) {
        // Map backend schema to Zustand ShippingRate schema cleanly
        const mappedRates: ShippingRate[] = data.shippingRates.map((rate: any) => ({
          handle: rate.handle,
          title: rate.title,
          amount: rate.amount
        }));

        setShippingRates(mappedRates);

        // Auto-select the cheapest available tier by default
        const cheapestRate = [...mappedRates].sort((a, b) => a.amount - b.amount)[0];
        setSelectedShippingRate(cheapestRate);
      } else {
        const fallback = isFreeEligible 
          ? { title: "Complimentary Free Shipping", amount: 0, handle: "free-shipping" }
          : { title: "Standard Shipping", amount: 119, handle: "default-paid" };
        setShippingRates([fallback]);
        setErrorMsg(data.message || "No shipping rates available for this location.");
        setSelectedShippingRate(fallback);
      }
    } catch (error) {
      console.error("Shipping calculation failure:", error);
      setErrorMsg("Unable to calculate rates for this pin code.");
      const fallback = isFreeEligible 
        ? { title: "Complimentary Free Shipping", amount: 0, handle: "free-shipping" }
        : { title: "Standard Shipping", amount: 119, handle: "default-paid" };
      setShippingRates([fallback]);
      setSelectedShippingRate(fallback);
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-trigger shipping rate calculations when the ZIP code (PIN Code) reaches exactly 6 digits (Standard in India)
  useEffect(() => {
    if (!hasPhysicalItems) return;
    const cleanZip = form.zip?.trim() || "";
    if (cleanZip.length === 6 && /^\d+$/.test(cleanZip)) {
      calculateRates();
    }
  }, [form.zip, hasPhysicalItems]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-900 font-serif">
          {hasPhysicalItems ? "Shipping Method" : "Delivery Method"}
        </h2>
        {hasPhysicalItems && form.zip?.trim().length >= 5 && (
          <button
            type="button"
            onClick={calculateRates}
            disabled={isCalculating}
            className="text-xs uppercase tracking-widest text-[#b8924a] hover:text-[#1a1410] font-bold transition-colors disabled:opacity-50"
          >
            {isCalculating ? "Calculating..." : "Recalculate"}
          </button>
        )}
      </div>

      {hasPhysicalItems ? 
        
       (
        <div className="bg-[#fafafa] rounded-md p-5 border border-gray-200 shadow-sm transition-all duration-300">
          {isCalculating ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-sm text-gray-500 font-medium">
              <AnimatedLoader2 size={20} className="animate-spin text-[#b8924a]" />
              <span>Consulting Shopify shipping profiles...</span>
            </div>
          ) : availableShippingRates.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {availableShippingRates.map((rate) => {
                const isSelected = selectedShippingRate?.handle === rate.handle;
                return (
                  <label
                    key={rate.handle}
                    className={`relative flex items-center justify-between p-4 rounded-md border bg-white cursor-pointer select-none transition-all duration-300 ${
                      isSelected
                        ? "border-black ring-1 ring-black shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="radio"
                        name="shipping_option"
                        checked={isSelected}
                        onChange={() => setSelectedShippingRate(rate)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{rate.title}</span>
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">Shopify Verified Delivery</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 font-sans">
                      {rate.amount === 0 ? "FREE" : formatPrice(rate.amount)}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="py-3 flex flex-col items-center justify-center gap-2 text-center">
              <AnimatedTruck size={24} className="text-gray-300" animateOn="view" />
              <p className="text-sm text-gray-500 font-medium leading-normal max-w-xs">
                {form.zip?.trim().length >= 6 
                  ? "Checking shipping availability..."
                  : "Please enter your PIN Code (6 digits) to load custom delivery methods."}
              </p>
            </div>
          )}

          {errorMsg && (
            <p className="mt-3.5 text-xs text-red-600 font-semibold pl-1 animate-fadeIn">
              ⚠️ {errorMsg}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
