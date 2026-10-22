"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AnimatedLoader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedShoppingBag } from "@/components/ui/icons/AnimatedShoppingBag";
import { AnimatedShield } from "@/components/ui/icons/AnimatedShield";
import { AnimatedRotateCcw } from "@/components/ui/icons/AnimatedRotateCcw";
import { AnimatedChevronRight } from "@/components/ui/icons/AnimatedChevronRight";
import { AnimatedMinus as Minus } from "@/components/ui/icons/AnimatedMinus";
import { AnimatedPlus as Plus } from "@/components/ui/icons/AnimatedPlus";
import { AnimatedTrash2 as Trash2 } from "@/components/ui/icons/AnimatedTrash2";
import { toast, Toaster } from "react-hot-toast";
import ShippingMethods from "./components/ShippingMethods";
import { motion, AnimatePresence } from "framer-motion";
import { trackBeginCheckout } from "@/lib/analytics";
import { analyticsToken } from '@/lib/first-party-analytics';

let activeCheckoutInstances = 0;

interface Props {
  customer?: any;
}

export default function CheckoutClient({ customer }: Props) {
  const { 
    items: cartItems, 
    cartTotal, 
    couponCode: cartCouponCode, 
    couponDiscount: cartCouponDiscount, 
    clearCart, 
    applyCoupon,
    subtotalAmount: cartSubtotalAmount,
    totalAmount: cartTotalAmount,
    discountAmount: storeDiscountAmount,
    discountErrorMessage,
    isApplyingDiscount,
    selectedShippingRate,
    finalTotalAmount,
    updateQuantity,
    removeFromCart,
    buyNowItem,
    buyNowDiscountAmount,
    buyNowCouponCode,
    buyNowCouponDiscount,
    clearBuyNow,
    updateBuyNowQuantity
  } = useCartStore();

  const isBuyNow = !!buyNowItem;
  const items = isBuyNow ? [buyNowItem] : cartItems;
  const couponCode = isBuyNow ? buyNowCouponCode : cartCouponCode;
  
  const subtotal = isBuyNow 
    ? (parseFloat(buyNowItem.price) * buyNowItem.cartQuantity)
    : (cartSubtotalAmount > 0 ? cartSubtotalAmount : cartTotal());

  const discountAmount = isBuyNow 
    ? buyNowDiscountAmount 
    : (cartSubtotalAmount > 0 ? storeDiscountAmount : (subtotal * cartCouponDiscount) / 100);

  const totalMRP = items.reduce((sum, item) => {
    const mrp = item.has_discount && item.discount_price ? parseFloat(item.discount_price) : parseFloat(item.price);
    return sum + mrp * item.cartQuantity;
  }, 0);
  const productDiscount = Math.max(0, totalMRP - subtotal);

  const hasPhysicalItems = items.some(item => item.requiresShipping !== false);
  const finalTotal = isBuyNow
    ? Math.max(0, subtotal - discountAmount + (hasPhysicalItems ? (subtotal >= 999 ? 0 : (selectedShippingRate ? selectedShippingRate.amount : 119)) : 0))
    : finalTotalAmount();

  const handleUpdateQuantity = async (productId: number | string, quantity: number, variantId?: string) => {
    if (isBuyNow) {
      await updateBuyNowQuantity(quantity);
    } else {
      await updateQuantity(productId, quantity, variantId);
    }
  };

  const handleRemoveFromCart = async (productId: number | string, variantId?: string) => {
    if (isBuyNow) {
      clearBuyNow();
      router.push("/");
    } else {
      await removeFromCart(productId, variantId);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [success, setSuccessState] = useState(false);
  const successRef = useRef(false);
  const setSuccess = (val: boolean) => {
    successRef.current = val;
    setSuccessState(val);
  };

  useEffect(() => {
    activeCheckoutInstances++;
    return () => {
      activeCheckoutInstances--;
      setTimeout(() => {
        if (activeCheckoutInstances === 0) {
          const state = useCartStore.getState();
          const currentBuyNowItem = state.buyNowItem;
          if (currentBuyNowItem && !successRef.current) {
            state.addToCart(currentBuyNowItem, currentBuyNowItem.cartQuantity);
            state.clearBuyNow();
          }
        }
      }, 100);
    };
  }, []);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);
  const [successTotal, setSuccessTotal] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("cod");
  const [billingSame, setBillingSame] = useState(true);
  const [activeStep, setActiveStep] = useState<'address' | 'summary' | 'payment'>('address');

  // Track checkout initiation (begin_checkout)
  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items, finalTotal);
    }
  }, []);

  const validateAddressForm = (): boolean => {
    if (!form.email || !form.email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (!form.firstName.trim()) {
      toast.error("Please enter your first name.");
      return false;
    }
    if (!form.lastName.trim()) {
      toast.error("Please enter your last name.");
      return false;
    }
    if (!form.address1.trim()) {
      toast.error("Please enter your shipping address.");
      return false;
    }
    if (!form.city.trim()) {
      toast.error("Please enter your city.");
      return false;
    }
    if (!form.state.trim()) {
      toast.error("Please enter your state.");
      return false;
    }
    if (!form.zip.trim()) {
      toast.error("Please enter a valid PIN Code.");
      return false;
    }
    if (!form.phone.trim()) {
      toast.error("Please enter your phone number.");
      return false;
    }
    const cleanPhone = form.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return false;
    }
    if (hasPhysicalItems && !selectedShippingRate) {
      toast.error("Please enter a valid PIN code to calculate and select a shipping method.");
      return false;
    }
    return true;
  };

  const handleContinueToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAddressForm()) {
      setActiveStep("summary");
      setTimeout(() => {
        const el = document.getElementById("accordion-summary-header");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const handleContinueToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveStep("payment");
    setTimeout(() => {
      const el = document.getElementById("accordion-payment-header");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep === "address") {
      handleContinueToSummary(e);
    } else if (activeStep === "summary") {
      handleContinueToPayment(e);
    } else if (activeStep === "payment") {
      handlePayNow(e);
    }
  };



  const [discountInput, setDiscountInput] = useState(couponCode || "");
  const [isApplying, setIsApplying] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: customer?.email || "",
    offers: true,
    country: "India",
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
    company: "",
    address1: customer?.defaultAddress?.address1 || "",
    address2: customer?.defaultAddress?.address2 || "",
    city: customer?.defaultAddress?.city || "",
    state: customer?.defaultAddress?.province || "",
    zip: customer?.defaultAddress?.zip || "",
    phone: customer?.phone || customer?.defaultAddress?.phone || "",
    saveInfo: true,
  });

  const router = useRouter();

  // Auto-set default flat shipping rate if missing on page load
  useEffect(() => {
    if (hasPhysicalItems && !selectedShippingRate) {
      const isFree = subtotal >= 999;
      const defaultRate = isFree
        ? { title: "Complimentary Free Shipping", amount: 0, handle: "free-shipping" }
        : { title: "Standard Shipping", amount: 119, handle: "default-paid" };
      
      useCartStore.getState().setSelectedShippingRate(defaultRate);
      useCartStore.getState().setShippingRates([defaultRate]);
    }
  }, [hasPhysicalItems, selectedShippingRate, subtotal]);

  // Helper to load Razorpay dynamically on request
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setIsApplying(true);
    setDiscountError(null);
    setDiscountSuccess(null);
    try {
      const success = await applyCoupon(discountInput.trim());
      if (success) {
        const state = useCartStore.getState();
        const updatedDiscountAmount = state.discountAmount;
        const currentSubtotal = state.subtotalAmount || state.cartTotal();
        const discountPercentage = currentSubtotal > 0 ? Math.round((updatedDiscountAmount / currentSubtotal) * 100) : 0;
        
        let successMessage = `Coupon "${discountInput.trim()}" applied successfully!`;
        if (updatedDiscountAmount > 0) {
          successMessage += ` Saved ${formatPrice(updatedDiscountAmount)} (${discountPercentage}% off).`;
        }
        
        setDiscountSuccess(successMessage);
        toast.success(`Coupon "${discountInput.trim()}" applied successfully!`);
      } else {
        const state = useCartStore.getState();
        const errorMsg = state.discountErrorMessage || `Discount code "${discountInput.trim()}" is invalid or not applicable.`;
        setDiscountError(errorMsg);
      }
    } catch (e) {
      console.error(e);
      setDiscountError("Failed to apply discount code.");
    } finally {
      setIsApplying(false);
    }
  };

  const checkoutRetryKey = () => {
    const fingerprint = JSON.stringify({
      items: items.map(item => [item.id, item.selectedVariantId, item.cartQuantity]),
      form, couponCode, paymentMethod,
    });
    const stored = sessionStorage.getItem('pb_checkout_retry');
    if (stored) {
      try {
        const previous = JSON.parse(stored);
        if (previous.fingerprint === fingerprint && previous.key) return previous.key;
      } catch { /* Replace invalid local state. */ }
    }
    const key = crypto.randomUUID();
    sessionStorage.setItem('pb_checkout_retry', JSON.stringify({ fingerprint, key }));
    return key;
  };

  const createOrder = async (financialStatus = "PENDING", gatewayRef = "") => {
    // If we're already processing an order and this is a COD flow, bypass the return block.
    // Razorpay uses a separate verify endpoint, so this function is mainly for COD.
    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutRetryKey() },
        body: JSON.stringify({
          analyticsToken: analyticsToken(),
          items,
          form,
          finalTotal,
          financialStatus,
          gatewayRef,
          couponCode,
          discountAmount,
          shippingRate: selectedShippingRate
        }),
      });

      const data = await response.json();
      if (data.success) {
        sessionStorage.removeItem('pb_checkout_retry');
        setSuccess(true);
        sessionStorage.setItem('pb_last_order', JSON.stringify({
          orderId: data.orderName || data.orderId,
          email: form.email,
          total: data.total,
          items: items,
          coupon: couponCode || undefined
        }));
        if (isBuyNow) {
          clearBuyNow();
        } else {
          clearCart();
        }
        router.push('/order-successfully');
      } else {
        toast.error(data.message || "Failed to create order");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while creating your order.");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const totalItems = items.reduce((s, i) => s + i.cartQuantity, 0);

  const confirmPayment = async (proof: {
    razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
  }) => {
    // Retain only the gateway proof so refresh/network errors can resume verification.
    sessionStorage.setItem('pb_pending_payment', JSON.stringify(proof));
    const response = await fetch('/api/checkout/razorpay/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proof),
    });
    const result = await response.json();
    if (!result.success) {
      toast.error(result.message || 'Payment confirmation is pending. Click Complete Purchase to check again; no new payment will be started.');
      return;
    }
    sessionStorage.setItem('pb_last_order', JSON.stringify({
      orderId: result.orderName || result.orderId, email: form.email,
      total: result.total, items, coupon: couponCode || undefined,
    }));
    sessionStorage.removeItem('pb_pending_payment');
    sessionStorage.removeItem('pb_checkout_retry');
    setSuccess(true);
    if (isBuyNow) clearBuyNow(); else clearCart();
    router.push('/order-successfully');
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const pendingProof = sessionStorage.getItem('pb_pending_payment');
      if (pendingProof) {
        try {
          await confirmPayment(JSON.parse(pendingProof));
        } finally {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
        return;
      }
      if (paymentMethod === "razorpay") {
        // 1. Dynamically Load official Razorpay JS library
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error("Failed to load Razorpay payment client. Please check your internet connection.");
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        // 2. Initialize Razorpay order on Next.js serverless backend
        const res = await fetch('/api/checkout/razorpay/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutRetryKey() },
          body: JSON.stringify({
            analyticsToken: analyticsToken(),
            items,
            form,
            finalTotal,
            couponCode,
            discountAmount,
            shippingRate: selectedShippingRate
          }),
        });

        const initData = await res.json();
        if (!initData.success) {
          toast.error(initData.message || "Failed to initialize payment gateway.");
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const { orderId, amount, keyId } = initData;

        // 3. Configure and Open official Razorpay Checkout Iframe Overlay
        const options = {
          key: keyId,
          amount: amount,
          currency: "INR",
          name: "Perfume Booth",
          description: "Premium Fragrances Purchase",
          image: "https://perfumebooth.com/logo.png", 
          order_id: orderId,
          handler: async function (response: any) {
            isProcessingRef.current = true;
            setIsProcessing(true);
            try {
              await confirmPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
            } catch (err) {
              console.error("Signature verification transaction exception:", err);
              toast.error("Confirmation interrupted. Click Complete Purchase to check again; do not pay again.");
            } finally {
              isProcessingRef.current = false;
              setIsProcessing(false);
            }
          },
          prefill: {
            name: `${form.firstName} ${form.lastName}`.trim(),
            email: form.email,
            contact: form.phone,
          },
          notes: {
            address: `${form.address1}, ${form.address2 || ''}, ${form.city}, ${form.state} - ${form.zip}`
          },
          theme: {
            color: "#1a1410", 
          },
          modal: {
            ondismiss: function() {
              isProcessingRef.current = false;
              setIsProcessing(false);
              toast.error("Checkout process canceled by customer.");
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();

      } else {
        // Cash on Delivery (COD) flow
        await createOrder("PENDING", "Cash on Delivery");
      }
    } catch (error) {
      console.error("Payment orchestrator failure:", error);
      toast.error("An unexpected error occurred processing your payment.");
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Unified single return statement to fully prevent any React reconciliation hook errors
  return (
    <>
      <Toaster position="bottom-right" />
      {!items.length && !isProcessing ? (
        <main className="min-h-screen bg-[#fafafa] flex items-center justify-center pt-20 animate-fadeIn">
          <div className="text-center max-w-md mx-auto px-6 py-20">
            <AnimatedShoppingBag size={56} className="mx-auto text-gray-300 mb-6" animateOn="view" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3 font-serif">Your cart is empty</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">Add exquisite fragrances to your cart to checkout.</p>
            <Link href="/all" className="inline-block bg-[#1a1410] text-white px-8 py-4 rounded-md font-semibold text-sm hover:bg-[#b8924a] transition-all duration-300 tracking-wider">
              Continue Shopping
            </Link>
          </div>
        </main>
      ) : (
        <main className="min-h-screen flex flex-col md:flex-row bg-white pt-28 pb-16 animate-fadeIn">
          {/* ─── LEFT COLUMN: CHECKOUT FORM ─── */}
          <div className="flex-1 px-4 md:px-12 lg:px-24 pt-10 pb-16 border-r border-gray-200">
            <div className="max-w-[600px] mx-auto md:ml-auto md:mr-0">
              <form onSubmit={handleFinalSubmit} className="space-y-6">

                {/* Step 1: Login Details (Always Pre-completed) */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-[#FAF9F6] shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full shrink-0 bg-green-700 flex items-center justify-center text-white text-[10px] font-bold mt-0.5">
                        ✓
                      </div>
                      <div>
                        <h2 className="text-xs uppercase tracking-widest text-gray-500 font-extrabold font-sans">1. Login Details</h2>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{form.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      Verified
                    </span>
                  </div>
                </div>

                {/* Step 2: Delivery Address Accordion */}
                <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                  activeStep === 'address' 
                    ? 'border-[#b8924a] bg-white shadow-md' 
                    : 'border-gray-200 bg-[#FAF9F6]/50 shadow-sm'
                }`}>
                  <div 
                    id="accordion-address-header"
                    className={`flex items-center justify-between p-5 ${
                      activeStep === 'address' ? 'border-b border-gray-100 bg-[#FAF9F6]/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors mt-0.5 ${
                        activeStep === 'address' 
                          ? 'bg-[#1a1410] text-white' 
                          : 'bg-green-700 text-white'
                      }`}>
                        {activeStep === 'address' ? '2' : '✓'}
                      </div>
                      <div>
                        <h2 className="text-xs uppercase tracking-widest font-extrabold font-sans text-gray-900">
                          2. Delivery Address
                        </h2>
                        {activeStep !== 'address' && (
                          <p className="text-sm text-gray-600 mt-1 font-medium leading-relaxed font-sans">
                            {form.firstName} {form.lastName} · {form.phone}
                            <br />
                            {form.address1}{form.address2 ? `, ${form.address2}` : ""}, {form.city} - {form.zip}
                          </p>
                        )}
                      </div>
                    </div>
                    {activeStep !== 'address' && (
                      <button
                        type="button"
                        onClick={() => setActiveStep('address')}
                        className="text-[11px] font-bold text-[#b8924a] hover:text-[#1a1410] uppercase tracking-wider hover:underline font-sans bg-amber-50 hover:bg-amber-100/60 px-2.5 py-1 rounded"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {activeStep === 'address' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 space-y-6">
                          {/* Saved Address Dropdown */}
                          {customer && customer.addresses?.edges?.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#b8924a] font-sans">
                                Select Saved Shipping Address
                              </label>
                              <div className="relative">
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "new") {
                                      return;
                                    }
                                    const addr = customer.addresses.edges.find((edge: any) => edge.node.id === val)?.node;
                                    if (addr) {
                                      setForm((prev) => ({
                                        ...prev,
                                        firstName: addr.firstName || prev.firstName,
                                        lastName: addr.lastName || prev.lastName,
                                        address1: addr.address1 || "",
                                        address2: addr.address2 || "",
                                        city: addr.city || "",
                                        state: addr.province || "",
                                        zip: addr.zip || "",
                                        phone: addr.phone || prev.phone
                                      }));
                                      toast.success("Saved address loaded successfully!");
                                    }
                                  }}
                                  value={
                                    customer.addresses.edges.find(
                                      (edge: any) =>
                                        edge.node.address1 === form.address1 &&
                                        edge.node.zip === form.zip
                                    )?.node.id || "new"
                                  }
                                  className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410] appearance-none bg-white font-medium text-gray-800"
                                >
                                  <option value="new">-- Use a different address / New Address --</option>
                                  {customer.addresses.edges.map((edge: any) => {
                                    const addr = edge.node;
                                    return (
                                      <option key={addr.id} value={addr.id}>
                                        {addr.firstName} {addr.lastName} - {addr.address1}, {addr.city} ({addr.zip})
                                      </option>
                                    );
                                  })}
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                              </div>
                            </div>
                          )}

                          {/* Address Input Form Fields */}
                          <div className="space-y-3">
                            <div className="relative">
                              <select name="country" value={form.country} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410] appearance-none bg-white">
                                <option value="India">India</option>
                              </select>
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <input type="text" name="firstName" placeholder="First name" required value={form.firstName} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />
                              <input type="text" name="lastName" placeholder="Last name" required value={form.lastName} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />
                            </div>

                            <input type="text" name="company" placeholder="Company (optional)" value={form.company} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />

                            <input type="text" name="address1" placeholder="Address" required value={form.address1} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />

                            <input type="text" name="address2" placeholder="Apartment, suite, unit, etc. (optional)" value={form.address2} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />

                            <div className="grid grid-cols-3 gap-3">
                              <input type="text" name="city" placeholder="City" required value={form.city} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />
                              <input type="text" name="state" placeholder="State" required value={form.state} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />
                              <input type="text" name="zip" placeholder="PIN Code" required value={form.zip} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />
                            </div>

                            <input type="tel" name="phone" placeholder="Phone Number (10 digits)" required value={form.phone} onChange={handleInput} className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:border-[#1a1410] focus:ring-1 focus:ring-[#1a1410]" />

                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                              <input type="checkbox" name="saveInfo" checked={form.saveInfo} onChange={handleInput} className="w-4 h-4 accent-[#1a1410] rounded border-gray-300" />
                              <span className="text-sm text-gray-600">Save this address information for next time</span>
                            </label>
                          </div>

                          {/* Calculated Shipping Methods */}
                          <div className="border-t border-gray-150 pt-6">
                            <ShippingMethods form={form} />
                          </div>

                          {/* Transition Button */}
                          <div className="flex justify-end pt-4 border-t border-gray-150">
                            <button
                              type="submit"
                              className="bg-[#1a1410] hover:bg-[#b8924a] text-white font-bold px-10 py-4 rounded text-xs uppercase tracking-[0.2em] transition-all duration-500 w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.98]"
                            >
                              Deliver to This Address <AnimatedChevronRight size={14} animateOn="hover" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Step 3: Order Summary Accordion */}
                <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                  activeStep === 'summary' 
                    ? 'border-[#b8924a] bg-white shadow-md' 
                    : 'border-gray-200 bg-[#FAF9F6]/50 shadow-sm'
                }`}>
                  <div 
                    id="accordion-summary-header"
                    className={`flex items-center justify-between p-5 ${
                      activeStep === 'summary' ? 'border-b border-gray-100 bg-[#FAF9F6]/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors mt-0.5 ${
                        activeStep === 'summary' 
                          ? 'bg-[#1a1410] text-white' 
                          : activeStep === 'payment'
                          ? 'bg-green-700 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {activeStep === 'payment' ? '✓' : '3'}
                      </div>
                      <div>
                        <h2 className={`text-xs uppercase tracking-widest font-extrabold font-sans ${
                          activeStep === 'address' ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          3. Order Summary
                        </h2>
                        {activeStep === 'payment' && (
                          <p className="text-sm text-gray-600 mt-1 font-medium font-sans">
                            {totalItems} {totalItems === 1 ? 'Item' : 'Items'} selected
                          </p>
                        )}
                      </div>
                    </div>
                    {activeStep === 'payment' && (
                      <button
                        type="button"
                        onClick={() => setActiveStep('summary')}
                        className="text-[11px] font-bold text-[#b8924a] hover:text-[#1a1410] uppercase tracking-wider hover:underline font-sans bg-amber-50 hover:bg-amber-100/60 px-2.5 py-1 rounded"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {activeStep === 'summary' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 space-y-6">
                          
                          {/* List of Cart Items directly inside the accordion */}
                          <div className="space-y-4">
                            {items.map((item) => {
                              const activePrice = parseFloat(item.price);
                              return (
                                <div key={`${item.id}-${item.selectedVariantId}`} className="flex items-center gap-4 bg-[#fcfbfc] p-4 rounded-xl border border-gray-150 shadow-sm transition-all duration-300 hover:border-gray-200">
                                  <Link href={`/products/${item.handle}`} className="relative w-20 h-24 bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center hover:opacity-90 transition-opacity">
                                    {item.image ? (
                                      <Image src={item.image} alt={item.title} fill className="object-contain p-1" sizes="80px" />
                                    ) : (
                                      <AnimatedShoppingBag size={24} className="text-gray-300" />
                                    )}
                                  </Link>
                                  
                                  <div className="flex-1 min-w-0">
                                    <Link href={`/products/${item.handle}`} className="hover:text-[var(--color-gold)] transition-colors">
                                      <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-wider">{item.title}</p>
                                    </Link>
                                    <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-0.5">{(item.selectedVariantTitle && item.selectedVariantTitle !== "Default Title") ? item.selectedVariantTitle : (item.size_ml ? `${item.size_ml}ml` : item.brand)}</p>
                                    
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-xs font-bold text-gray-800">
                                        {formatPrice(activePrice)}
                                      </span>
                                      {item.has_discount && item.discount_price && (
                                        <span className="text-[10px] text-gray-400 line-through">
                                          {formatPrice(parseFloat(item.discount_price))}
                                        </span>
                                      )}
                                      {item.has_discount && item.discount_price && (
                                        <span className="text-[10px] font-semibold text-[#b8924a]">
                                          {Math.round(((parseFloat(item.discount_price) - activePrice) / parseFloat(item.discount_price)) * 100)}% off
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      {item.requiresShipping !== false ? (
                                        <span className="inline-flex items-center text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                          📦 Ships in 3-5 days
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                          📧 Instant Digital Delivery
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Quantity controllers inside the main page, super interactive! */}
                                    <div className="flex items-center gap-3 mt-3">
                                      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-white shadow-sm">
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.id, item.cartQuantity - 1, item.selectedVariantId)}
                                          disabled={item.cartQuantity <= 1}
                                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                          aria-label={`Decrease quantity of ${item.title}`}
                                        >
                                          <Minus size={11} animateOn="hover" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-bold text-gray-800">
                                          {item.cartQuantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.id, item.cartQuantity + 1, item.selectedVariantId)}
                                          disabled={item.cartQuantity >= (item.stock_count || 50)}
                                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                          aria-label={`Increase quantity of ${item.title}`}
                                        >
                                          <Plus size={11} animateOn="hover" />
                                        </button>
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => removeFromCart(item.id, item.selectedVariantId)}
                                        className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 px-3 py-1.5 rounded-full transition-all"
                                        aria-label={`Remove ${item.title}`}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm font-bold text-gray-900 flex-shrink-0 text-right">
                                    {item.cartQuantity > 1 && (
                                      <span className="text-xs text-gray-400 font-normal block mb-0.5">
                                        {formatPrice(activePrice)} x {item.cartQuantity}
                                      </span>
                                    )}
                                    {formatPrice(activePrice * item.cartQuantity)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 font-medium">Order confirmation will be sent to <span className="font-bold text-gray-700">{form.email}</span></p>
                            <button
                              type="submit"
                              className="bg-[#1a1410] hover:bg-[#b8924a] text-white font-bold px-10 py-4 rounded text-xs uppercase tracking-[0.2em] transition-all duration-500 w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.98]"
                            >
                              Confirm Items & Continue <AnimatedChevronRight size={14} animateOn="hover" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Step 4: Payment Options Accordion */}
                <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                  activeStep === 'payment' 
                    ? 'border-[#b8924a] bg-white shadow-md' 
                    : 'border-gray-200 bg-[#FAF9F6]/50 shadow-sm'
                }`}>
                  <div 
                    id="accordion-payment-header"
                    className={`flex items-center justify-between p-5 ${
                      activeStep === 'payment' ? 'border-b border-gray-100 bg-[#FAF9F6]/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors mt-0.5 ${
                        activeStep === 'payment' 
                          ? 'bg-[#1a1410] text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        4
                      </div>
                      <h2 className={`text-xs uppercase tracking-widest font-extrabold font-sans ${
                        activeStep !== 'payment' ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        4. Payment Options
                      </h2>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {activeStep === 'payment' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 space-y-6">
                          
                          {/* Payment Section */}
                          <section className="space-y-4">
                            <div>
                              <p className="text-sm text-gray-500 leading-relaxed font-sans">All transactions are fully encrypted, secure, and PCI-DSS compliant.</p>
                            </div>

                            <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
                              {/* Razorpay Option */}
                              <label className={`flex items-center justify-between p-4 cursor-pointer border-b border-gray-300 transition-colors ${paymentMethod === 'razorpay' ? 'bg-[#FAF6F0]' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <input type="radio" name="payment" value="razorpay" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} className="w-4 h-4 accent-[#1a1410]" />
                                  <span className="text-sm font-medium text-gray-900">Razorpay (Cards, UPI, NetBanking, Wallets)</span>
                                </div>
                                <div className="flex gap-2 items-center opacity-75">
                                  <span className="text-[10px] font-bold text-[#b8924a] bg-[#b8924a]/10 px-2 py-0.5 rounded uppercase tracking-wider">Popular</span>
                                </div>
                              </label>

                              {paymentMethod === "razorpay" && (
                                <div className="p-6 bg-[#fafafa] text-center border-b border-gray-300 leading-relaxed font-sans">
                                  <p className="text-sm text-gray-600">After clicking "Complete Purchase", the Razorpay secure overlay will open directly in-context to finalize your payment.</p>
                                </div>
                              )}

                              {/* COD Option */}
                              <label className={`flex items-center p-4 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'bg-[#FAF6F0]' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="w-4 h-4 accent-[#1a1410]" />
                                  <span className="text-sm font-medium text-gray-900">Cash on Delivery (COD)</span>
                                </div>
                              </label>
                            </div>
                          </section>

                          {/* Billing Address Section */}
                          <section className="border-t border-gray-150 pt-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-3 font-serif">Billing Address</h3>
                            <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
                              <label className={`flex items-center p-4 cursor-pointer border-b border-gray-300 transition-colors ${billingSame ? 'bg-[#FAF6F0]' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <input type="radio" name="billing" checked={billingSame} onChange={() => setBillingSame(true)} className="w-4 h-4 accent-[#1a1410]" />
                                  <span className="text-sm font-medium text-gray-900">Same as shipping address</span>
                                </div>
                              </label>

                              <label className={`flex items-center p-4 cursor-pointer transition-colors ${!billingSame ? 'bg-[#FAF6F0]' : 'bg-white'}`}>
                                <div className="flex items-center gap-3">
                                  <input type="radio" name="billing" checked={!billingSame} onChange={() => setBillingSame(false)} className="w-4 h-4 accent-[#1a1410]" />
                                  <span className="text-sm font-medium text-gray-900">Use a different billing address</span>
                                </div>
                              </label>
                            </div>
                          </section>

                          {/* Final Submission Buttons */}
                          <div className="pt-6 border-t border-gray-150 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                            <button
                              type="button"
                              onClick={() => {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                setActiveStep("summary");
                              }}
                              className="text-sm font-bold text-[#b8924a] hover:text-[#1a1410] transition-colors hover:underline text-center sm:text-left flex items-center gap-1.5"
                            >
                              ← Back to Order Summary
                            </button>
                            <button
                              type="submit"
                              disabled={isProcessing}
                              className="bg-[#1a1410] hover:bg-[#b8924a] text-white font-bold px-10 py-4 rounded text-xs uppercase tracking-[0.2em] transition-all duration-500 w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.98] disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <><AnimatedLoader2 size={14} className="animate-spin" /> Finalizing Order...</>
                              ) : (
                                <>Complete Purchase <AnimatedChevronRight size={14} animateOn="hover" /></>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 text-[10px] uppercase tracking-wider text-gray-400 flex flex-wrap gap-6 justify-center md:justify-start font-semibold">
                  <Link href="#" className="hover:text-black transition-colors">Refund policy</Link>
                  <Link href="#" className="hover:text-black transition-colors">Shipping policy</Link>
                  <Link href="#" className="hover:text-black transition-colors">Privacy policy</Link>
                  <Link href="#" className="hover:text-black transition-colors">Terms of service</Link>
                </div>

              </form>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: ORDER SUMMARY ─── */}
          <div className="w-full md:w-[45%] lg:w-[40%] bg-[#fafafa] px-4 md:px-10 lg:px-12 pt-10 pb-16">
            <div className="max-w-[420px] mx-auto md:ml-0 md:mr-auto sticky top-28">

              {/* Cart items list */}
              <div className="space-y-4 mb-6">
                {items.map((item) => {
                  const activePrice = parseFloat(item.price);
                  return (
                    <div key={`${item.id}-${item.selectedVariantId}`} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm transition-all duration-300 hover:border-gray-200">
                      <Link href={`/products/${item.handle}`} className="relative w-16 h-20 bg-gray-50 border border-gray-200 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center hover:opacity-90 transition-opacity">
                        {item.image ? (
                          <Image src={item.image} alt={item.title} fill className="object-contain p-1" sizes="64px" />
                        ) : (
                          <AnimatedShoppingBag size={20} className="text-gray-300" />
                        )}
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${item.handle}`} className="hover:text-[var(--color-gold)] transition-colors">
                          <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-wider">{item.title}</p>
                        </Link>
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-0.5">{(item.selectedVariantTitle && item.selectedVariantTitle !== "Default Title") ? item.selectedVariantTitle : (item.size_ml ? `${item.size_ml}ml` : item.brand)}</p>
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold text-gray-800">
                            {formatPrice(activePrice)}
                          </span>
                          {item.has_discount && item.discount_price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              {formatPrice(parseFloat(item.discount_price))}
                            </span>
                          )}
                          {item.has_discount && item.discount_price && (
                            <span className="text-[10px] font-semibold text-[#b8924a]">
                              {Math.round(((parseFloat(item.discount_price) - activePrice) / parseFloat(item.discount_price)) * 100)}% off
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          {item.requiresShipping !== false ? (
                            <span className="inline-flex items-center text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded tracking-wide uppercase">
                              📦 Ships in 3-5 days
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-1.5 py-0.5 rounded tracking-wide uppercase">
                              📧 Instant Digital Delivery
                            </span>
                          )}
                        </div>
                        
                        {/* Interactive Quantity Adjuster */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-gray-200 rounded-full overflow-hidden bg-gray-50">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, item.cartQuantity - 1, item.selectedVariantId)}
                              disabled={item.cartQuantity <= 1}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Decrease quantity of ${item.title}`}
                            >
                              <Minus size={10} animateOn="hover" />
                            </button>
                            <span className="w-6 text-center text-[10px] font-bold text-gray-800">
                              {item.cartQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, item.cartQuantity + 1, item.selectedVariantId)}
                              disabled={item.cartQuantity >= (item.stock_count || 50)}
                              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Increase quantity of ${item.title}`}
                            >
                              <Plus size={10} animateOn="hover" />
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.id, item.selectedVariantId)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            aria-label={`Remove ${item.title}`}
                          >
                            <Trash2 size={12} animateOn="hover" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0 text-right">
                        {item.cartQuantity > 1 && (
                          <span className="text-xs text-gray-400 font-normal block mb-0.5">
                            {formatPrice(activePrice)} x {item.cartQuantity}
                          </span>
                        )}
                        {formatPrice(activePrice * item.cartQuantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discount/Coupon Application Form */}
              <div className="py-6 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="discount code"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value.toUpperCase());
                      if (discountError) setDiscountError(null);
                      if (discountSuccess) setDiscountSuccess(null);
                    }}
                    className={`flex-1 border rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all bg-white uppercase ${
                      discountError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-400"
                        : discountSuccess
                        ? "border-green-400 focus:border-green-500 focus:ring-green-400"
                        : "border-gray-300 focus:border-[#1a1410] focus:ring-[#1a1410]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={isApplying || !discountInput.trim()}
                    className={`font-bold px-6 py-3 rounded-md text-xs uppercase tracking-widest transition-all ${
                      !discountInput.trim() || isApplying
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : "bg-[#1a1410] text-white hover:bg-[#b8924a] cursor-pointer shadow-sm"
                    }`}
                  >
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
                {discountError && (
                  <p className="mt-2 text-xs text-red-600 font-semibold pl-1">
                    {discountError}
                  </p>
                )}
                {discountSuccess && (
                  <p className="mt-2 text-xs text-green-700 font-semibold pl-1">
                    {discountSuccess}
                  </p>
                )}
              </div>

              {/* Pricing Details Breakdown */}
              <div className="py-6 border-t border-gray-200 space-y-3.5">
                {/* Product Breakdown List */}
                <div className="pb-4 border-b border-dashed border-gray-200 space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Breakdown</p>
                  {items.map((item) => {
                    const activePrice = parseFloat(item.price);
                    const lineTotal = activePrice * item.cartQuantity;
                    return (
                      <div key={`${item.id}-${item.selectedVariantId}`} className="flex justify-between items-start gap-4 text-xs text-gray-700">
                        <span className="font-medium flex-1">
                          {item.title} <span className="text-gray-400 font-normal whitespace-nowrap text-[10px] ml-1">({formatPrice(activePrice)} x {item.cartQuantity})</span>
                        </span>
                        <span className="font-bold text-gray-900 whitespace-nowrap">{formatPrice(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Total MRP</span>
                  <span className="font-bold text-gray-900">{formatPrice(totalMRP)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span className="font-medium">Product Discount</span>
                  <span className="font-bold">{productDiscount > 0 ? `− ${formatPrice(productDiscount)}` : "₹0"}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span className="font-medium">Coupon Discount ({couponCode})</span>
                    <span className="font-bold">− {formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Shipping</span>
                  {!hasPhysicalItems || subtotal >= 999 ? (
                    <span className="text-green-700 font-bold text-xs uppercase tracking-wider">Free Shipping</span>
                  ) : (
                    <span className="font-bold text-gray-900">
                      {formatPrice(selectedShippingRate ? selectedShippingRate.amount : 119)}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Totals Section */}
              <div className="py-6 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm uppercase tracking-widest font-bold text-gray-900 font-serif">Total Amount</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] text-gray-400 font-bold">INR</span>
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* Exclusive trust signals sidebar panel */}
              <div className="mt-8 border border-gray-200 bg-[#fbfcfa] rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <AnimatedShield size={18} className="text-[#b8924a]" animateOn="view" />
                  <p className="text-[11px] text-gray-600 font-medium leading-normal">
                    <span className="font-bold text-gray-800">100% Encrypted Transactions.</span> All transaction channels are completely secured using secure socket layers.
                  </p>
                </div>
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <AnimatedRotateCcw size={18} className="text-[#b8924a]" animateOn="view" />
                  <p className="text-[11px] text-gray-600 font-medium leading-normal">
                    <span className="font-bold text-gray-800">Transit Damage Guarantee.</span> All orders are covered against damage or loss during transit.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </main>
      )}
    </>
  );
}
