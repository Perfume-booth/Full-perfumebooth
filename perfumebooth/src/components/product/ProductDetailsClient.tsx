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

  const activePrice = String(selectedVariant ? selectedVariant.price : product.price);
  const activeComparePrice = selectedVariant ? selectedVariant.compareAtPrice : product.compare_at_price;
  const activeStock = Math.max(0, Number(selectedVariant ? selectedVariant.quantityAvailable : product.stock_count) || 0);
  const isSoldOut = activeStock <= 0 || selectedVariant?.availableForSale === false || product.availableForSale === false;
  useEffect(() => { setQuantity(1); }, [selectedVariant?.id]);

  const { isInWishlist, addItem, removeItem } = useWishlist();
  const { addToCart, openCart, items, buyNow, clearBuyNow } = useCartStore();
  const { addRecent } = useRecentStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Pincode & Delivery Date State
  const [pincode, setPincode] = useState<string | null>(null);
  const [city, setCity] = useState<string>("");
  const [inputPincode, setInputPincode] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [pincodeError, setPincodeError] = useState<string>("");
  const [isCheckerExpanded, setIsCheckerExpanded] = useState<boolean>(true);

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

  const isInCart = items.some(item => item.id.toString() === product.id.toString());

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
    if (isSoldOut || quantity > activeStock) return;
    setIsBuyingNow(true);

    const variantId = selectedVariant?.id || product.variants?.[0]?.id;
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
    if (isInCart) {
      router.push("/cart");
      return;
    }
    if (isSoldOut || isAdding || quantity > activeStock) return;
    setIsAdding(true);
    try {
      const variantId = selectedVariant?.id || product.variants?.[0]?.id;
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
    <div className="flex flex-col w-full h-full space-y-6 md:space-y-8 text-gray-900 md:pt-4">

      {/* 1. Brand & Title Area */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/${brandSlug}`} className="inline-block">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-primary)]  font-bold mb-2 block hover:underline">
                {brandName}
              </span>
            </Link>
            <h1 className="text-lg md:text-2xl font-bold text-[var(--color-gold)] capitalize">
              {product.title}
            </h1>
            {selectedVariant && selectedVariant.title && selectedVariant.title !== "Default Title" && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
                  Selected Edition:
                </span>
                <span className="text-xs font-bold text-gray-900 bg-white px-2.5 py-0.5 rounded-md border border-[var(--color-gold)]/40 shadow-xs flex items-center gap-1.5">
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
          <div className="flex items-center gap-2 shrink-0">
            {isMounted && (
              <button
                onClick={toggleWishlist}
                aria-label={isWishlisted ? `Remove ${product.title} from your wishlist` : `Add ${product.title} to your wishlist`}
                className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${isWishlisted
                  ? 'border-[#b03a2e] bg-[#b03a2e]/10 text-[#b03a2e]'
                  : 'border-[var(--color-border)] bg-[#fbfcfa] text-[var(--color-text-secondary)] hover:border-[#1a1410] hover:text-[#1a1410]'
                  }`}
                title={isWishlisted ? "In Wishlist" : "Add to Wishlist"}
              >
                <Heart size={16} animateOn="click" className={isWishlisted ? "fill-[#b03a2e] text-[#b03a2e]" : ""} />
              </button>
            )}
            <div className="relative">
              <button
                onClick={handleShare}
                aria-label={isCopied ? "Link copied to clipboard" : `Share ${product.title}`}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[#fbfcfa] text-[var(--color-text-secondary)] hover:border-[#1a1410] hover:text-[#1a1410] transition-all"
                title="Share"
              >
                <Share2 size={16} animateOn="hover" />
              </button>
              {isCopied && (
                <span className="absolute -top-8 -left-6 bg-black text-white text-[9px] uppercase tracking-widest px-2 py-1 rounded shadow-lg whitespace-nowrap animate-fade-in">
                  Link Copied
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating & Reviews Summary (Tightened) */}
        {(product.rating_count && product.rating_count > 0) ? (
          <div
            className="flex items-center gap-3 py-1 cursor-pointer hover:opacity-80 transition-opacity"
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
            className="flex items-center gap-2 py-1 cursor-pointer hover:opacity-80 transition-opacity text-xs text-[var(--color-text-muted)] italic font-light"
            onClick={() => document.getElementById('product-reviews')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span>No reviews yet</span>
          </div>
        )}
      </div>

      {/* 2. Price & Badges Area (Compact) */}
      <div className="space-y-4">
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
          {isSoldOut ? (
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-red-600 text-white text-[8px] md:text-[9px] uppercase tracking-[0.15em] font-bold rounded-full shadow-sm">
              Sold Out
            </span>
          ) : (
            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] md:text-[9px] uppercase tracking-[0.15em] font-bold rounded-full flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              In Stock {activeStock > 0 && activeStock <= 10 ? `(Only ${activeStock} left)` : ""}
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

      {/* 3. Scent Profile Area (Olfactory Pyramid) */}
      <div className="py-4 border-y border-[var(--color-border)]/50 space-y-4">
        <h5 className="text-[12px] uppercase tracking-[0.2em] font-bold text-[var(--color-gold)]">Olfactory Pyramid</h5>
        <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
          {/* Visual Pyramid */}
          <div className="relative w-36 h-28 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-sm">
              {/* Top Section (Triangle) */}
              <path d="M50 5 L33 30 L67 30 Z" fill="url(#topGrad)" className="transition-all duration-300 hover:opacity-90 cursor-help" />
              <text x="50" y="23" textAnchor="middle" fill="#7b0d1e" fontSize="5.5" fontWeight="900" letterSpacing="0.5">TOP</text>

              {/* Middle Section (Trapezoid) */}
              <path d="M31 33 L18 55 L82 55 L69 33 Z" fill="url(#midGrad)" className="transition-all duration-300 hover:opacity-90 cursor-help" />
              <text x="50" y="47" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.5">HEART</text>

              {/* Base Section (Trapezoid) */}
              <path d="M16 58 L3 80 L97 80 L84 58 Z" fill="url(#baseGrad)" className="transition-all duration-300 hover:opacity-90 cursor-help" />
              <text x="50" y="72" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="900" letterSpacing="0.5">BASE</text>

              <defs>
                <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fdfcfb" />
                  <stop offset="100%" stopColor="#d4bfa0" />
                </linearGradient>
                <linearGradient id="midGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a96a" />
                  <stop offset="100%" stopColor="#b8924a" />
                </linearGradient>
                <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a01428" />
                  <stop offset="100%" stopColor="#7b0d1e" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Scent Description List */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-start gap-3 border-l-2 border-[#b8924a]/30 pl-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--color-gold)]">Top Notes</span>
                <span className="text-[13px] font-light text-[var(--color-text-primary)] leading-tight">
                  {product.top_notes || "Citrus, Bergamot & Fresh Ozone"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-[#b8924a]/60 pl-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--color-gold)]">Heart (Middle) Notes</span>
                <span className="text-[13px] font-light text-[var(--color-text-primary)] leading-tight">
                  {product.middle_notes || "Jasmine, Lavender & Soft Floral Accords"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 border-l-2 border-[#7b0d1e]/80 pl-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[var(--color-maroon)]">Base Notes</span>
                <span className="text-[13px] font-light text-[var(--color-text-primary)] leading-tight">
                  {product.base_notes || "Warm Amber, Patchouli, Sensual Musk & Cedarwood"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Persistence & Cart Controls */}
      <div className="space-y-3 pt-2">
          <div className="flex gap-4">
            {/* Quantity Picker */}
            <div
              className={`flex items-center justify-between border border-[var(--color-border)] px-6 py-4 min-w-[140px] bg-[#fbfcfa] ${isSoldOut ? 'opacity-50 pointer-events-none' : ''}`}
              aria-label="Select quantity"
            >
              <button
                onClick={decreaseQuantity}
                disabled={isSoldOut || quantity <= 1}
                className="text-[#8a7968] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Decrease quantity of ${product.title}`}
              >
                <Minus size={14} animateOn="hover" />
              </button>
              <span className="text-sm font-bold text-[var(--color-text-primary)]" aria-live="polite">{quantity}</span>
              <button
                onClick={increaseQuantity}
                disabled={isSoldOut || quantity >= maxQuantity}
                className="text-[#8a7968] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Increase quantity of ${product.title}`}
              >
                <Plus size={14} animateOn="hover" />
              </button>
            </div>

            {/* Add to Cart */}
            <button
              disabled={isAdding || (isSoldOut && !isInCart)}
              onClick={handleAddToCart}
              aria-label={isSoldOut ? `Cannot add ${product.title} to cart - Sold Out` : isInCart ? `Go to cart` : `Add ${product.title} to your collection`}
              className={`flex-grow py-4 gap-2 flex flex-row justify-center items-center text-[11px] md:text-[15px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-black/5 ${(isSoldOut && !isInCart) || isAdding
                ? 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed'
                : isInCart
                  ? 'bg-[var(--color-gold)] text-white hover:bg-[#1a1410]'
                  : 'bg-[#1a1410] text-white hover:bg-[#b8924a]'
                }`}
            >
              <AnimatedShoppingCart size={14} />
              {isAdding ? 'Adding...' : (isSoldOut && !isInCart) ? 'Sold Out' : isInCart ? 'Go to Cart' : 'Add to Collection'}
            </button>
          </div>

          {isSoldOut && <RestockNotification key={selectedVariant?.id || String(product.id)} productId={product.id} variantId={selectedVariant?.id} variantTitle={selectedVariant?.title} />}
          <button
            onClick={handleBuyNow}
            disabled={isSoldOut || isBuyingNow}
            aria-disabled={isBuyingNow || isSoldOut}
            className={`w-full py-4 text-[11px] md:text-[15px] uppercase tracking-[0.25em] font-bold border transition-all duration-500 flex items-center justify-center gap-2 ${isSoldOut
              ? "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed opacity-80"
              : "border-[#1a1410] text-white bg-[#1a1410] hover:bg-[#b8924a] hover:border-[#b8924a]"
              }`}
          >
            <span aria-live="polite" className="flex items-center gap-2">
              {isBuyingNow ? (
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
        <div className="space-y-4 pt-1">
          {pincode && (
            <div className="p-4 bg-[#fdfcfb] border border-[#ede8e0] rounded-xl flex items-start gap-3.5 transition-all shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#b8924a]/10 flex items-center justify-center text-[#b8924a] shrink-0 mt-0.5 animate-fadeIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-900 leading-normal">
                  FREE delivery <span className="text-[#b8924a]">{getDeliveryDateStr()}</span>.
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#807667] font-medium uppercase tracking-wider">
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
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#faf7f2] transition-colors"
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

        {/* 5. Trust Signals */}
        <div className="pt-2">
          <ProductTrustBadges />
          <div className="mt-6 border-t border-[var(--color-border)] pt-8 mb-[10px]">
            <ProductPaymentInfo />
          </div>
        </div>

    </div>
  );
}
