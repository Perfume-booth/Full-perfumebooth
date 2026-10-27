/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { AnimatedShare2 as Share2 } from "@/components/ui/icons/AnimatedShare2";
import { AnimatedHeart as Heart } from "@/components/ui/icons/AnimatedHeart";
import { AnimatedPlus as Plus } from "@/components/ui/icons/AnimatedPlus";
import { AnimatedMinus as Minus } from "@/components/ui/icons/AnimatedMinus";
import { AnimatedLoader2 as Loader2 } from "@/components/ui/icons/AnimatedLoader2";
import { AnimatedStar as Star } from "@/components/ui/icons/AnimatedStar";
import type { Product } from "@/app/products/[slug]/page";
import ProductTrustBadges from "./ProductTrustBadges";
import ProductPaymentInfo from "./ProductPaymentInfo";
import RestockNotification from "./RestockNotification";
import { useProductVariant } from "./ProductVariantContext";
import { useRecentStore } from "@/store/useRecentStore";
import { useWishlist } from "@/store/useWishlist";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from 'next/navigation';
import { normalizeProduct, toStoreProduct, getBrandFromTags } from "@/lib/transformers";
import Link from "next/link";
import { trackViewItem, trackAddToCart } from "@/lib/analytics";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { AnimatedShoppingCart } from "../ui/icons";
import { AnimatedChevronDown } from "@/components/ui/icons/AnimatedChevronDown";
import { AnimatedMapPin as MapPin } from "@/components/ui/icons/AnimatedMapPin";
import { SiPaytm, SiPhonepe } from "react-icons/si";
import { FaAmazonPay, FaGooglePay } from "react-icons/fa";
const PINCODE_MAP: Record<string, string> = {
  "110001": "New Delhi",
  "400001": "Mumbai",
  "400050": "Mumbai",
  "400052": "Mumbai",
  "700001": "Kolkata",
  "600001": "Chennai",
  "560001": "Bangalore",
  "122002": "Gurugram",
  "201301": "Noida",
  "380001": "Ahmedabad",
  "411001": "Pune",
  "500001": "Hyderabad",
};

interface Props {
  product: Product;
}

export default function ProductDetailsClient({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const { selectedVariant } = useProductVariant();
  const needsVariantSelection = Boolean(product.variants?.length) && !selectedVariant;
  const chooseVariant = () => document.getElementById("product-variants")?.scrollIntoView({ behavior: "smooth", block: "center" });

  const activePrice = String(selectedVariant ? selectedVariant.price : product.price);
  const activeComparePrice = selectedVariant ? selectedVariant.compareAtPrice : product.compare_at_price;
  const activeStock = Math.max(0, Number(selectedVariant ? selectedVariant.quantityAvailable : product.stock_count) || 0);
  const isSoldOut = !needsVariantSelection && (activeStock <= 0 || selectedVariant?.availableForSale === false || product.availableForSale === false);
  useEffect(() => { setQuantity(1); }, [selectedVariant?.id]);

  const { isInWishlist, addItem, removeItem } = useWishlist();
  const { addToCart, openCart, items, buyNow, clearBuyNow } = useCartStore();
  const { addRecent } = useRecentStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Pincode & Delivery Date State
  const [pincode, setPincode] = useState<string | null>("110059");
  const [city, setCity] = useState<string>("West Delhi");
  const [inputPincode, setInputPincode] = useState<string>("110059");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [pincodeError, setPincodeError] = useState<string>("");
  const [isCheckerExpanded, setIsCheckerExpanded] = useState<boolean>(false);

  // Initialize and load saved pincode
  useEffect(() => {
    const saved = localStorage.getItem("pb_deliver_to");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.pincode) {
          setPincode(parsed.pincode);
          setCity(parsed.label || "");
          setInputPincode(parsed.pincode);
          setIsCheckerExpanded(false); // Collapse if already set
        }
      } catch (e) {
        console.error("Error parsing saved location:", e);
      }
    }
  }, []);

  // Listen to external location changes (e.g. from the header DeliverTo component)
  useEffect(() => {
    const handleLocationChange = () => {
      const saved = localStorage.getItem("pb_deliver_to");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.pincode) {
            setPincode(parsed.pincode);
            setCity(parsed.label || "");
            setInputPincode(parsed.pincode);
          } else {
            setPincode(null);
            setCity("");
          }
        } catch (e) { }
      } else {
        setPincode(null);
        setCity("");
      }
    };
    window.addEventListener("pb_location_changed", handleLocationChange);
    return () => window.removeEventListener("pb_location_changed", handleLocationChange);
  }, []);

  const getDeliveryDateStr = () => {
    if (pincode && pincode.startsWith("11")) {
      return "in 3 to 4 days";
    }
    return "in 5 to 7 days";
  };

  const handleCheckDelivery = async () => {
    const pin = inputPincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPincodeError("Please enter a valid 6-digit pincode");
      return;
    }
    setPincodeError("");
    setIsChecking(true);

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice[0]) {
          const office = data[0].PostOffice[0];
          const resolvedCity = office.District || office.State || "Your Area";

          const newLoc = { pincode: pin, label: resolvedCity };
          localStorage.setItem("pb_deliver_to", JSON.stringify(newLoc));
          setPincode(pin);
          setCity(resolvedCity);
          setIsCheckerExpanded(false);

          window.dispatchEvent(new Event("pb_location_changed"));
          toast.success(`Delivery details loaded for ${resolvedCity}`);
          setIsChecking(false);
          return;
        }
      }
    } catch (e) {
      console.error("Pincode API error, falling back to local mapping:", e);
    }

    const localCity = PINCODE_MAP[pin] || "Your Area";
    const newLoc = { pincode: pin, label: localCity };
    localStorage.setItem("pb_deliver_to", JSON.stringify(newLoc));
    setPincode(pin);
    setCity(localCity);
    setIsCheckerExpanded(false);

    window.dispatchEvent(new Event("pb_location_changed"));
    toast.success(`Delivery details loaded for ${localCity}`);
    setIsChecking(false);
  };
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const router = useRouter();

  const isInCart = !needsVariantSelection && items.some(item =>
    item.id.toString() === product.id.toString() &&
    (item.selectedVariantId || "") === (selectedVariant?.id || "")
  );

  const isWishlisted = isInWishlist(product.id.toString());

  useEffect(() => {
    setIsLoggedIn(Cookies.get("isLoggedIn") === "true");
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Track recently viewed
    if (product) {
      addRecent(product);
      trackViewItem(product as any);
    }
  }, [product, addRecent]);

  useEffect(() => {
    clearBuyNow();
  }, [clearBuyNow]);

  // Coupons/Offers section hidden as per request

  const toggleWishlist = () => {
    if (isWishlisted) {
      removeItem(product.id.toString());
    } else {
      const isLoggedIn = Cookies.get('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        const normalized = normalizeProduct(product);
        localStorage.setItem('pending_wishlist_product', JSON.stringify(toStoreProduct(normalized)));
        router.push(`/auth?mode=signin&returnUrl=/wishlist`);
        return;
      }
      const normalized = normalizeProduct(product);
      addItem(toStoreProduct(normalized) as any);
    }
  };

  const handleBuyNow = async () => {
    if (needsVariantSelection) { chooseVariant(); return; }
    if (isSoldOut || quantity > activeStock) return;
    setIsBuyingNow(true);

    const variantId = selectedVariant?.id;
    if (!variantId && product.variants && product.variants.length > 0) {
      alert("Product variant not found.");
      setIsBuyingNow(false);
      return;
    }

    try {
      const prodPayload = {
        ...product,
        selectedVariantId: variantId,
        price: selectedVariant ? selectedVariant.price : product.price,
      };
      await buyNow(prodPayload as any, quantity);
      trackAddToCart(product as any, quantity);
      router.push("/checkout");
    } catch (e) {
      console.error(e);
      alert("Checkout error.");
      setIsBuyingNow(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} at The Scent of Silence`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  const handleAddToCart = async () => {
    if (needsVariantSelection) { chooseVariant(); return; }
    if (isInCart) {
      router.push("/cart");
      return;
    }
    if (isSoldOut || isAdding || quantity > activeStock) return;
    setIsAdding(true);
    try {
      const variantId = selectedVariant?.id;
      const normalized = normalizeProduct({
        ...product,
        selectedVariantId: variantId,
        price: selectedVariant ? selectedVariant.price : product.price,
      });
      await addToCart(toStoreProduct(normalized), quantity);
      trackAddToCart(product as any, quantity);
      openCart();
    } finally {
      setIsAdding(false);
    }
  };

  const maxQuantity = activeStock;
  const increaseQuantity = () => setQuantity((prev) => (prev < maxQuantity ? prev + 1 : prev));
  const decreaseQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const brandName = getBrandFromTags(product.tags) || "";
  const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col w-full h-full space-y-3.5 md:space-y-4 text-gray-900 md:pt-1">

      {/* 1. Brand & Title Area */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/${brandSlug}`} className="inline-block">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-primary)]  font-bold mb-0.5 block hover:underline">
                {brandName}
              </span>
            </Link>
            <h1 className="text-lg md:text-2xl font-bold text-[var(--color-gold)] capitalize">
              {product.title}
            </h1>
            {selectedVariant && selectedVariant.title && selectedVariant.title !== "Default Title" && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
                  Selected Edition:
                </span>
                <span className="text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-[var(--color-gold)]/40 shadow-xs flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[var(--color-gold)]"></span>
                  {selectedVariant.title}
                  {selectedVariant.option1_value && selectedVariant.option1_value !== selectedVariant.title ? ` • ${selectedVariant.option1_value}` : ""}
                </span>
                {selectedVariant.sku && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    SKU: {selectedVariant.sku}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rating & Reviews Summary (Tightened) */}
        {(product.rating_count && product.rating_count > 0) ? (
          <div
            className="flex items-center gap-3 py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => document.getElementById('product-reviews')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="flex items-center gap-0.5 scale-90 origin-left">
              {[1, 2, 3, 4, 5].map((num) => (
                <Star
                  key={num}
                  size={14}
                  fill={(product.rating || 0) >= num ? "currentColor" : "none"}
                  strokeWidth={(product.rating || 0) >= num ? 0 : 2}
                  className="text-[var(--color-gold)]"
                />
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-primary)] font-semibold border-l border-[var(--color-border)] pl-3">
              {product.rating_count} Reviews
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity text-xs text-[var(--color-text-muted)] italic font-light"
            onClick={() => document.getElementById('product-reviews')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>No reviews yet</span>
          </div>
        )}
      </div>

      {/* 2. Price & Badges Area (Compact) */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg md:text-3xl text-[var(--color-text-primary)]">Rs. {activePrice}</span>
          {activeComparePrice && parseFloat(activeComparePrice) > parseFloat(activePrice) && (
            <>
              <span className="text-sm md:text-lg text-[var(--color-text-muted)] line-through opacity-70">Rs. {activeComparePrice}</span>
              <span className="text-xs md:text-sm font-bold text-[var(--color-maroon)]">
                {Math.round(((parseFloat(activeComparePrice) - parseFloat(activePrice)) / parseFloat(activeComparePrice)) * 100)}% off
              </span>
            </>
          )}
          <span className="text-[8px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold ml-auto md:ml-0">Incl. all taxes</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {isSoldOut && (
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-red-600 text-white text-[8px] md:text-[9px] uppercase tracking-[0.15em] font-bold rounded-full shadow-sm">
              Sold Out
            </span>
          )}
          {product.tagline && (
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[#fbfcfa] border border-[var(--color-border)] text-[8px] md:text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] font-bold rounded-full">
              {product.tagline}
            </span>
          )}
          {product.gender && (
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-[#1a1410] text-[var(--color-gold)] text-[8px] md:text-[9px] uppercase tracking-[0.15em] font-bold rounded-full">
              {product.gender}
            </span>
          )}
        </div>
      </div>

      {/* 3. Trust Signals (4-Column Badges Card) */}
      <ProductTrustBadges />

      {/* 4. Persistence & Cart Controls */}
      <div className="space-y-2 pt-0.5">
          <div className="flex gap-2 sm:gap-3">
            {/* Quantity Picker */}
            <div
              className={`flex items-center justify-between border border-[var(--color-border)] px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl min-w-[88px] sm:min-w-[115px] bg-[#fbfcfa] shadow-xs ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}
              aria-label="Select quantity"
            >
              <button
                onClick={decreaseQuantity}
                disabled={needsVariantSelection || isSoldOut || quantity <= 1}
                className="p-1 text-[#8a7968] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Decrease quantity of ${product.title}`}
              >
                <Minus size={13} animateOn="hover" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)] px-1" aria-live="polite">{quantity}</span>
              <button
                onClick={increaseQuantity}
                disabled={needsVariantSelection || isSoldOut || quantity >= maxQuantity}
                className="p-1 text-[#8a7968] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Increase quantity of ${product.title}`}
              >
                <Plus size={13} animateOn="hover" />
              </button>
            </div>

            {/* Add to Cart */}
            <button
              disabled={isAdding || (isSoldOut && !isInCart)}
              onClick={handleAddToCart}
              aria-label={needsVariantSelection ? "Choose an edition" : isSoldOut ? `Cannot add ${product.title} to cart - Sold Out` : isInCart ? `Go to cart` : `Add ${product.title} to your collection`}
              className={`flex-grow py-2.5 sm:py-3 px-3 gap-2 flex flex-row justify-center items-center text-xs sm:text-[13px] uppercase tracking-[0.12em] sm:tracking-[0.18em] font-bold rounded-xl transition-all shadow-md active:scale-[0.98] ${(isSoldOut && !isInCart) || isAdding
                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed'
                : isInCart
                  ? 'bg-[var(--color-gold)] text-white hover:bg-[#1a1410]'
                  : 'bg-[#1a1410] text-white hover:bg-[#b8924a]'
                }`}
            >
              <AnimatedShoppingCart size={15} />
              <span className="truncate">{needsVariantSelection ? 'Choose an edition' : isAdding ? 'Adding...' : (isSoldOut && !isInCart) ? 'Sold Out' : isInCart ? 'Go to Cart' : 'Add to Cart'}</span>
            </button>
          </div>

          {isSoldOut && <div id="restock-notification"><RestockNotification key={selectedVariant?.id || String(product.id)} productId={product.id} variantId={selectedVariant?.id} variantTitle={selectedVariant?.title} /></div>}
          <button
            onClick={handleBuyNow}
            disabled={isSoldOut || isBuyingNow}
            aria-disabled={isBuyingNow || isSoldOut}
            className={`w-full py-2.5 sm:py-3 px-4 text-xs sm:text-[13px] uppercase tracking-[0.12em] sm:tracking-[0.2em] font-bold rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] ${isSoldOut
              ? "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed opacity-80"
              : "border-[#1a1410] text-white bg-[#1a1410] hover:bg-[#b8924a] hover:border-[#b8924a]"
              }`}
          >
            <span aria-live="polite" className="flex items-center gap-2">
              {needsVariantSelection ? "Choose an edition" : isBuyingNow ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Finalizing...
                </>
              ) : isSoldOut ? (
                "Out of Stock"
              ) : (
                <>
                  <span>Buy Now</span>

                  <span className="inline-flex items-center  ml-1 normal-case tracking-normal">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100 z-30">
                      <SiPaytm className="w-4.5 h-4.5 text-[#002970]" />
                    </span>

                    <span className="w-6 h-6 rounded-full bg-[#5f259f] flex items-center justify-center shadow-sm shrink-0 -ml-1.5 z-20">
                      <SiPhonepe className="w-4.5 h-4.5 text-white" />
                    </span>

                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100 -ml-1.5 z-10">
                      <FaGooglePay className="w-4.5 h-4.5 text-[#4285F4]" />
                    </span>

                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-gray-100 -ml-1.5 z-0">
                      <FaAmazonPay className="w-[18px] h-[18px] text-[#ff9900]" />
                    </span>
                  </span>
                </>
              )}
            </span>
          </button>

        </div>

        {/* Delivery Status and Pincode Checkers */}
        <div className="space-y-2 pt-0.5">
          {pincode && (
            <div className="p-2.5 sm:p-3 bg-[#fdfcfb] border border-[#ede8e0] rounded-xl flex items-start gap-3 transition-all shadow-sm">
              <div className="w-7 h-7 rounded-full bg-[#b8924a]/10 flex items-center justify-center text-[#b8924a] shrink-0 mt-0.5 animate-fadeIn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gray-900 leading-normal">
                  FREE delivery <span className="text-[#b8924a]">{getDeliveryDateStr()}</span>.
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#807667] font-medium uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-[#b8924a] inline" />
                    Delivering to {city || "India"} {pincode}
                  </span>
                  <span className="text-[#ede8e0] hidden sm:inline">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckerExpanded(true);
                      setTimeout(() => {
                        document.getElementById("pincode-input")?.focus();
                      }, 100);
                    }}
                    className="text-[#b8924a] hover:underline font-bold transition-all text-[9px]"
                  >
                    Update location
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border border-[#ede8e0] rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
            <button
              type="button"
              onClick={() => setIsCheckerExpanded(!isCheckerExpanded)}
              className="w-full px-4 py-2.5 sm:py-3 flex items-center justify-between hover:bg-[#faf7f2] transition-colors"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-900">
                Check Delivery Date
              </span>
              <AnimatedChevronDown
                size={14}
                className={`text-[#807667] transition-transform duration-300 ${isCheckerExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isCheckerExpanded && (
              <div className="px-5 pb-5 pt-1 border-t border-[#ede8e0]/60 space-y-4 animate-fade-in">
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input
                      id="pincode-input"
                      type="text"
                      maxLength={6}
                      placeholder="Enter your pincode"
                      value={inputPincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setInputPincode(val);
                        if (pincodeError) setPincodeError("");
                      }}
                      className={`w-full px-4 py-3 bg-[#fdfcfb] border rounded-lg text-xs font-semibold placeholder:text-[#807667]/60 focus:outline-none focus:ring-1 focus:ring-[#b8924a] transition-all ${pincodeError ? "border-red-400" : "border-[#ede8e0]"
                        }`}
                    />
                    {pincodeError && (
                      <p className="absolute left-1 -bottom-4 text-[9px] text-red-500 font-bold uppercase tracking-wider">
                        {pincodeError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isChecking}
                    onClick={handleCheckDelivery}
                    className="px-5 py-3 bg-[#1a1410] text-[var(--color-gold)] hover:bg-[#b8924a] hover:text-white disabled:opacity-50 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Checking
                      </>
                    ) : (
                      "Check Delivery"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Payment Methods */}
        <div className="pt-2">
          <div className="border-t border-[var(--color-border)] pt-6 mb-[10px]">
            <ProductPaymentInfo />
          </div>
        </div>
      {/* Mobile Sticky Bottom Action Bar (Fixed, 1-Tap Checkout/Cart) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-extrabold text-[var(--color-text-primary)]">Rs. {activePrice}</span>
            {activeComparePrice && parseFloat(activeComparePrice) > parseFloat(activePrice) && (
              <span className="text-[10px] text-[var(--color-text-muted)] line-through">
                Rs. {activeComparePrice}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--color-gold)] font-bold truncate max-w-[130px]">
            {selectedVariant?.title && selectedVariant.title !== "Default Title" ? selectedVariant.title : (isSoldOut ? "Out of Stock" : "Free Delivery")}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {needsVariantSelection ? (
            <button type="button" onClick={chooseVariant} className="px-4 py-2.5 bg-[#1a1410] text-white text-xs font-bold rounded-xl">
              Choose an edition
            </button>
          ) : isSoldOut ? (
            <button
              onClick={() => {
                document.getElementById('restock-notification')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs"
            >
              Notify Me
            </button>
          ) : (
            <>
              <button
                disabled={isAdding}
                onClick={handleAddToCart}
                className="px-3.5 py-2.5 bg-gray-100 text-gray-900 border border-gray-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
              >
                <AnimatedShoppingCart size={13} />
                <span>{isInCart ? 'In Cart' : 'Add'}</span>
              </button>
              <button
                disabled={isBuyingNow}
                onClick={handleBuyNow}
                className="px-4 py-2.5 bg-[#1a1410] text-[var(--color-gold)] hover:bg-[#b8924a] hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-1"
              >
                {isBuyingNow ? <Loader2 size={13} className="animate-spin" /> : <span>Buy Now</span>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
