/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatedShoppingCart } from "@/components/ui/icons/AnimatedShoppingCart";
import { AnimatedStar } from "@/components/ui/icons/AnimatedStar";
import { AnimatedTruck } from "@/components/ui/icons/AnimatedTruck";
import { AnimatedHeart } from "@/components/ui/icons/AnimatedHeart";
import { AnimatedGitCompare } from "@/components/ui/icons/AnimatedGitCompare";
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/store/useWishlist';
import { useCompareStore } from '@/store/useCompareStore';
import { normalizeProduct, toStoreProduct } from '@/lib/transformers';
import { trackAddToCart } from '@/lib/analytics';
import Cookies from 'js-cookie';

interface ProductCardProps {
    product: any; 
    deliveryDate?: string;
    priority?: boolean;
}

export default function ProductCard({ 
    product: rawProduct, 
    deliveryDate: passedDeliveryDate,
    priority = false
}: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [isAdding, setIsAdding] = useState(false);
    const { addToCart, openCart } = useCartStore();
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [pincode, setPincode] = useState<string | null>(null);

    const getProductUrl = () => {
        const productHandle = rawProduct.handle ||rawProduct.slug || '';
        if (!pathname || pathname === '/' || pathname.startsWith('/products')) {
            return `/products/${productHandle}`;
        }
        const fromPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        return `/products/${productHandle}?from=${encodeURIComponent(fromPath)}`;
    };

    useEffect(() => {
        setIsLoggedIn(Cookies.get("isLoggedIn") === "true");
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const loadPincode = () => {
            const saved = localStorage.getItem("pb_deliver_to");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.pincode) {
                        setPincode(parsed.pincode);
                        return;
                    }
                } catch (e) {}
            }
            setPincode(null);
        };

        loadPincode();
        window.addEventListener("pb_location_changed", loadPincode);
        return () => window.removeEventListener("pb_location_changed", loadPincode);
    }, []);

    // Normalize data using centralized utility - Memoized to prevent reference changes
    const product = React.useMemo(() => 
        normalizeProduct(rawProduct, passedDeliveryDate), 
    [rawProduct, passedDeliveryDate]);

    const getDynamicDeliveryDate = () => {
        if (pincode && pincode.startsWith("11")) {
            return "3 to 4 days";
        }
        return "5 to 7 days";
    };

    const {
        title,
        handle,
        images: allImages,
        price: sellingPrice,
        compareAtPrice: comparePrice,
        discountPercentage: discountPct,
        isSoldOut,
        rating,
        deliveryDate
    } = product;

    // Filter out empty images once
    const validImages = React.useMemo(() => 
        allImages.filter(src => typeof src === 'string' && src.trim() !== ""), 
    [allImages]);

    const hasMultiple = validImages.length > 1;

    // Wishlist Store
    const wishlistItems = useWishlist((state) => state.items);
    const { addItem: addWishlist, removeItem: removeWishlist } = useWishlist();
    const isWishlisted = wishlistItems.some((i) => i.id === product.id);
    
    // Compare Store
    const compareItems = useCompareStore((state) => state.items);
    const { addItem: addCompare, removeItem: removeCompare } = useCompareStore();
    const isInCompare = compareItems.some((item) => item.id === product.id);

    // ── AUTO-SLIDE ON HOVER ──
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        let resetTimeout: NodeJS.Timeout | null = null;

        if (isHovered && hasMultiple) {
            interval = setInterval(() => {
                setActiveIdx((prev) => (prev + 1) % validImages.length);
            }, 1500);
        } else {
            resetTimeout = setTimeout(() => setActiveIdx(0), 400);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (resetTimeout) clearTimeout(resetTimeout);
        };
    }, [isHovered, hasMultiple, validImages.length]);

    // ── HANDLERS ──
    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isSoldOut || isAdding) return;
        setIsAdding(true);
        
        try {
            const storeProduct = toStoreProduct(product);
            await addToCart(storeProduct as any, 1);
            trackAddToCart(product as any, 1);
            openCart();
        } finally {
            setIsAdding(false);
        }
    };

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isWishlisted) {
            removeWishlist(product.id);
        } else {
            const loggedIn = Cookies.get('isLoggedIn') === 'true';
            if (!loggedIn) {
                localStorage.setItem('pending_wishlist_product', JSON.stringify(toStoreProduct(product) as any));
                router.push('/auth?mode=signin&returnUrl=/wishlist');
                return;
            }
            addWishlist(toStoreProduct(product) as any);
        }
    };

    const toggleCompare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInCompare) {
            removeCompare(product.id);
        } else {
            addCompare(toStoreProduct(product) as any);
        }
    };

    const handleTouchStart = () => {
        setIsHovered(true);
    };

    const handleTouchEnd = () => {
        setTimeout(() => setIsHovered(false), 2000);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (hasMultiple) {
            setActiveIdx(1);
        }
    };

    return (
        <Link 
            href={getProductUrl()} 
            className={`product-card group relative flex flex-col h-full w-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-500 rounded-2xl overflow-hidden ${isSoldOut ? "opacity-80" : ""}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* ── IMAGE AREA ──────────────────────────── */}
            <div className="relative aspect-square w-full bg-[#f9f9f9] overflow-hidden rounded-2xl flex items-center justify-center border-b border-[var(--color-border)]">
                {validImages.map((src, idx) => {
                    const shouldRender = idx === activeIdx || idx === 0 || isHovered;
                    if (!shouldRender) return null;
                    return (
                        <div
                            key={src + idx}
                            className="absolute inset-0 transition-opacity duration-500 flex items-center justify-center"
                            style={{ opacity: idx === activeIdx ? 1 : 0, zIndex: idx === activeIdx ? 1 : 0 }}
                        >
                            <Image
                                src={src}
                                alt={`${title} - View ${idx}`}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className={`object-contain mix-blend-multiply transition-transform duration-1000 p-2 sm:p-3 md:p-4 ${isSoldOut ? "grayscale" : ""}`}
                                style={{ transform: isHovered && !isSoldOut && idx === activeIdx ? "scale(1.08)" : "scale(1)" }}
                                priority={priority && activeIdx === 0}
                            />
                        </div>
                    );
                })}

                {/* Dot indicators */}
                {hasMultiple && (
                    <div className={`absolute bottom-4 left-0 right-0 flex justify-center gap-1 z-20 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
                        {validImages.slice(0, 5).map((_, idx) => (
                            <div
                                key={idx}
                                className={`rounded-full transition-all duration-300 ${idx === activeIdx ? "w-4 h-1.5 bg-black/60" : "w-1.5 h-1.5 bg-black/20"}`}
                            />
                        ))}
                    </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                    {isSoldOut ? (
                        <div className="bg-[#b8924a] text-white text-[9px] font-bold px-3 py-1 uppercase tracking-widest transition-all animate-pulse">
                            Coming Soon
                        </div>
                    ) : discountPct > 0 ? (
                        <div className="bg-[#444444] text-white text-[9px] font-bold px-3 py-1 uppercase tracking-widest shadow-sm">
                            -{discountPct}% OFF
                        </div>
                    ) : null}
                </div>

                {/* Hover Actions */}
                <div className={`absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20 transition-all duration-300 ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                    {isMounted && (
                        <button 
                            type="button"
                            onClick={toggleWishlist} 
                            suppressHydrationWarning
                            aria-label={isWishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
                            className={`w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors ${isWishlisted ? 'text-[var(--color-maroon)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-maroon)]'}`}
                        >
                            <AnimatedHeart size={14} className={isWishlisted ? "fill-current" : ""} />
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={toggleCompare} 
                        suppressHydrationWarning
                        aria-label={isInCompare ? `Remove ${title} from comparison` : `Add ${title} to comparison`}
                        className={`w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transition-colors ${isInCompare ? 'text-[var(--color-gold)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-gold)]'}`}
                    >
                        <AnimatedGitCompare size={14} className={isInCompare ? "fill-current" : ""} />
                    </button>
                </div>
            </div>

            {/* ── INFO AREA ──────────────────────────── */}
            <div className="p-2 sm:p-3 md:p-4 flex flex-col flex-grow bg-white gap-1.5 sm:gap-2">
                <h3 className="text-[11px] sm:text-xs md:text-sm  text-[var(--color-text-primary)] leading-snug line-clamp-2 min-h-[2.4em]">
                    {title}
                </h3>

                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-auto">
                    <span className="text-[12px] sm:text-sm font-bold text-[var(--color-text-primary)]">
                        ₹{sellingPrice.toLocaleString("en-IN")}
                    </span>
                    {comparePrice > sellingPrice && (
                        <>
                            <span className="text-[9px] sm:text-[10px] text-[var(--color-text-muted)] line-through">
                                ₹{comparePrice.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-bold text-[var(--color-maroon)]">
                                {discountPct}% off
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-80">
                    <AnimatedTruck size={9} className="text-[var(--color-text-muted)]" />
                    <span suppressHydrationWarning className="text-[7px] sm:text-[8px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide truncate">
                        in {getDynamicDeliveryDate()}
                    </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
                    <div className="flex items-center text-[var(--color-gold)] gap-0.5" aria-label={`Rating: ${product.reviewCount > 0 ? rating : 0} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = product.reviewCount > 0 && (rating || 4.9) >= star;
                            return (
                                <AnimatedStar
                                    key={star}
                                    size={10}
                                    fill={isFilled ? "currentColor" : "none"}
                                    strokeWidth={isFilled ? 0 : 2}
                                />
                            );
                        })}
                        <span className="text-[10px] font-bold text-neutral-500 ml-1 font-sans">
                            ({product.reviewCount > 0 ? product.reviewCount : 0})
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isSoldOut || isAdding}
                        suppressHydrationWarning
                        aria-label={isSoldOut ? `Sold Out` : `Add to cart`}
                        className={`shrink-0 h-6 sm:h-7 md:h-8 px-2 sm:px-3 md:px-4 rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-300 ${
                            isSoldOut || isAdding
                                ? "bg-[var(--color-bg-subtle)] text-[var(--color-soldout)] cursor-not-allowed"
                                : "bg-[var(--color-text-primary)] text-white hover:bg-[var(--color-maroon)] shadow-sm"
                        }`}
                    >
                        {isSoldOut ? "Out" : isAdding ? "..." : <><AnimatedShoppingCart size={9} className="sm:size-[11px]" /> Add</>}
                    </button>
                </div>
            </div>
        </Link>
    );
}