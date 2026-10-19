import { Product } from "@/types/product";
import { METAFIELD_MAPPINGS } from "./product-fields.config";
import { cleanImageUrl } from './media-url';
export { cleanImageUrl } from './media-url';

export function cleanMetafieldValue(val: any): string {
    if (val === undefined || val === null) return "";
    const strVal = typeof val === 'string' ? val.trim() : JSON.stringify(val).trim();
    
    // Check if it is a JSON array
    if (strVal.startsWith("[") && strVal.endsWith("]")) {
        try {
            const arr = JSON.parse(strVal);
            if (Array.isArray(arr)) {
                return arr.map(item => {
                    if (typeof item === 'string') return item.trim();
                    if (typeof item === 'number') return item.toString();
                    return JSON.stringify(item);
                }).filter(Boolean).join(", ");
            }
        } catch (e) {
            // ignore and fallback
        }
    }
    
    // Check if it is a JSON object
    if (strVal.startsWith("{") && strVal.endsWith("}")) {
        try {
            const obj = JSON.parse(strVal);
            if (obj && typeof obj === 'object') {
                if (obj.value !== undefined) {
                    const num = parseFloat(obj.value);
                    if (!isNaN(num)) {
                        return num % 1 === 0 ? num.toFixed(0) : num.toString();
                    }
                    return obj.value.toString();
                }
            }
        } catch (e) {
            // ignore and fallback
        }
    }
    
    return strVal;
}

/**
 * Sanitizes and normalizes product categories/types, stripping out raw taxonomy
 * paths like "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes > Eaux de Parfum"
 * and standardizing to clean consumer fragrance terms like "Eau de Parfum", "Extrait de Parfum", "Attar", etc.
 */
export function cleanCategoryName(raw?: string): string {
    if (!raw || typeof raw !== "string") return "";

    let cleaned = raw.trim();

    // If breadcrumb taxonomy style with ">", extract the most specific leaf segment
    if (cleaned.includes(">")) {
        const parts = cleaned.split(">").map((s) => s.trim()).filter(Boolean);
        cleaned = parts[parts.length - 1] || "";
    }

    // Remove common prefix taxonomy words if somehow still prefixed
    cleaned = cleaned
        .replace(/^health\s*&\s*beauty\s*/i, "")
        .replace(/^personal\s*care\s*/i, "")
        .replace(/^cosmetics\s*/i, "")
        .replace(/^perfumes\s*(&|and)\s*colognes\s*/i, "")
        .replace(/^perfumes\s*/i, "")
        .replace(/^colognes\s*/i, "")
        .trim();

    const lower = cleaned.toLowerCase();

    // Fragrance concentration & category normalization
    if (/^(eaux?|eau)\s*de\s*p/i.test(lower) || lower === "edp") {
        return "Eau de Parfum";
    }
    if (/^extrait/i.test(lower) || lower.includes("extract") || lower === "cpo") {
        return "Extrait de Parfum";
    }
    if (/^(eaux?|eau)\s*de\s*t/i.test(lower) || lower === "edt") {
        return "Eau de Toilette";
    }
    if (/^(eaux?|eau)\s*de\s*c/i.test(lower) || lower === "edc") {
        return "Eau de Cologne";
    }
    if (lower.includes("attar") || lower.includes("ittar") || lower.includes("concentrated perfume")) {
        return "Attar";
    }
    if (lower.includes("deodorant")) {
        return "Deodorant";
    }
    if (lower.includes("mist") || lower.includes("spray") || lower.includes("body")) {
        return "Body Mist";
    }
    if (lower.includes("gift") || lower.includes("set") || lower.includes("discovery")) {
        return "Gift Set";
    }

    // Fallbacks for generic or invalid categories
    if (
        !cleaned ||
        lower === "uncategorized" ||
        lower.includes("pet") ||
        lower.includes("animal") ||
        lower === "fragrance" ||
        lower === "fragrances"
    ) {
        return "Fragrances";
    }

    return cleaned;
}


export interface NormalizedProduct {
    id: string;
    title: string;
    handle: string;
    brand: string;
    tags?: string[];
    images: string[];
    featuredImage: string;
    price: number;
    compareAtPrice: number;
    discountPercentage: number;
    isSoldOut: boolean;
    rating: number;
    reviewCount: number;
    deliveryDate: string;
    top_notes: string;
    middle_notes: string;
    base_notes: string;
    gender: string;
    size_ml: string;
    selectedVariantId: string;
    stock_count: number;
    productType?: string;
    product_form?: string;
    bottle_material?: string;
    weight?: string;
    shipping?: any;
    isFull?: boolean;
    raw: any;
}

export function parseRating(product: any): { rating: number, reviewCount: number } {
    let rating = 0;
    let reviewCount = 0;

    if (product?.jdgm_rating?.value) {
        rating = parseFloat(product.jdgm_rating.value);
        reviewCount = parseInt(product.jdgm_count?.value || "0");
    } else if (typeof product?.rating === 'number') {
        rating = product.rating;
        reviewCount = product.rating_count || 0;
    } else if (product?.rating?.value) {
        try {
            const r = JSON.parse(product.rating.value);
            // Use r.value if present and not null/undefined, otherwise fallback
            const val = (r && r.value !== undefined) ? r.value : product.rating.value;
            rating = parseFloat(val) || 0;
            reviewCount = parseInt(product.rating_count?.value || "0") || 0;
        } catch (e) {
            rating = parseFloat(product.rating.value) || 0;
            reviewCount = parseInt(product.rating_count?.value || "0") || 0;
        }
    } else if (product?.rating_count?.value) {
        reviewCount = parseInt(product.rating_count.value);
    }
    
    if (isNaN(rating)) rating = 0;
    if (isNaN(reviewCount)) reviewCount = 0;
    
    return { rating, reviewCount };
}
export function getBrandFromTags(tags: any): string | null {
    if (!tags) return null;
    let tagsArray: string[] = [];
    if (Array.isArray(tags)) {
        tagsArray = tags;
    } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim());
    } else {
        return null;
    }
    
    const brandsList = [
        "al haramain", 
        "arabiyat prestige", 
        "lomani", 
        "louis cardin", 
        "mpf", 
        "new nb", 
        "otoori", 
        "lattafa", 
        "swiss arabian"
    ];
    for (const tag of tagsArray) {
        const lowerTag = tag.toLowerCase().trim();
        const found = brandsList.find(b => lowerTag === b || lowerTag.includes(b) || b.includes(lowerTag));
        if (found) {
            return tag.trim();
        }
    }
    return null;
}

/**
 * Normalizes product data returned by the catalog API.
 * into a consistent format for the UI.
 */
export function normalizeProduct(product: any, passedDeliveryDate?: string): NormalizedProduct {
    if (!product) return {} as NormalizedProduct;

    const title = product.title || "";
    const handle = product.handle || product.slug || "";

    const rawTags = product.tags || product.tag || [];
    const tags = Array.isArray(rawTags)
        ? rawTags
        : (typeof rawTags === 'string' ? rawTags.split(',').map((t: string) => t.trim()) : []);

    const brand = getBrandFromTags(tags) || "";
    
    // Normalize Images
    const allImages: string[] = [];
    const featImg = cleanImageUrl(product.image || product.featuredImage?.url);
    if (featImg) allImages.push(featImg);
    
    const nodes = product.images?.nodes || product.images?.edges?.map((e: any) => e.node) || [];
    nodes.forEach((n: any) => {
        const url = cleanImageUrl(n?.url || n?.image);
        if (url && !allImages.includes(url)) allImages.push(url);
    });
    
    if (Array.isArray(product.images)) {
        product.images.forEach((img: any) => {
            const url = cleanImageUrl(typeof img === 'string' ? img : (img.url || img.image));
            if (url && !allImages.includes(url)) allImages.push(url);
        });
    }

    if (allImages.length === 0) {
        allImages.push("https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop");
    }

    // Normalize Prices
    let sellingPrice = 0;
    let comparePrice = 0;

    const parsePrice = (val: any) => {
        if (!val) return 0;
        const str = val.toString().replace(/[^0-9.]/g, '');
        return parseFloat(str) || 0;
    };

    if (product.priceRange) {
        // Legacy edge-based data structure
        sellingPrice = parsePrice(product.priceRange.minVariantPrice?.amount);
        const cap = product.compareAtPriceRange?.minVariantPrice?.amount;
        comparePrice = cap ? parsePrice(cap) : 0;
    } else {
        // Flattened or Legacy structure
        const pPrice = parsePrice(product.price);
        const dPrice = parsePrice(product.discount_price);

        if (dPrice > 0) {
            if (dPrice > pPrice) {
                sellingPrice = pPrice;
                comparePrice = dPrice;
            } else if (dPrice < pPrice) {
                sellingPrice = dPrice;
                comparePrice = pPrice;
            } else {
                sellingPrice = pPrice;
                comparePrice = 0;
            }
        } else {
            sellingPrice = pPrice;
            comparePrice = parsePrice(product.compare_at_price);
        }
    }

    const variants = product.variants?.edges?.map((edge: any) => edge.node) || product.variants || [];
    const firstVariant = variants.find((v: any) => v.id === product.selectedVariantId)
        || variants.find((v: any) => v.availableForSale && v.quantityAvailable > 0)
        || variants[0];
    if (firstVariant) {
        sellingPrice = parsePrice(firstVariant.price);
        comparePrice = parsePrice(firstVariant.compareAtPrice ?? firstVariant.compare_at_price);
    }
    const discountPct = comparePrice > sellingPrice
        ? Math.round(((comparePrice - sellingPrice) / comparePrice) * 100) : 0;
    const stock_count = firstVariant && typeof firstVariant.quantityAvailable === 'number'
        ? firstVariant.quantityAvailable
        : (product.stock_count !== undefined 
            ? product.stock_count 
            : 0);

    const isSoldOut = product.availableForSale === false || (stock_count === 0);

    // Normalize Rating
    const { rating, reviewCount } = parseRating(product);

    // Normalize Delivery Date
    const prodIdString = product.id?.toString() || "";
    const seed = prodIdString.charCodeAt(prodIdString.length - 1) || 0;

    const getDeliveryDate = (days = 4) => {
        // Use a stable reference (e.g., today at 00:00) to ensure consistency during same-day sessions
        const d = new Date();
        d.setHours(0, 0, 0, 0); 
        d.setDate(d.getDate() + days);
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    };
    const deliveryDate = passedDeliveryDate || (product as any).deliveryDate || getDeliveryDate(3 + (seed % 4));

    // Normalize Metafields
    const getMeta = (key: string) => {
        // 1. Array case (e.g. from REST API or somewhere else passing metafields array)
        if (Array.isArray(product.metafields)) {
            return product.metafields.find((m: any) => m.key === key)?.value || "";
        }
        // 2. Object case (e.g. product.metafields.gender)
        if (product.metafields?.[key]) {
            const meta = product.metafields[key];
            return typeof meta === 'object' && meta !== null ? (meta.value ?? "") : (meta ?? "");
        }
        // 3. Directly on product (e.g. GraphQL response where we aliased it or did not alias)
        // Check mapping and fallbacks first
        const mapping = METAFIELD_MAPPINGS[key];
        if (mapping) {
            for (let i = 0; i < mapping.keys.length; i++) {
                const alias = i === 0 ? key : `${key}_fallback_${i}`;
                const valObj = product[alias];
                if (valObj !== undefined && valObj !== null) {
                    if (typeof valObj === 'object' && 'value' in valObj) {
                        return valObj.value ?? "";
                    }
                    return valObj;
                }
            }
        }
        // Fallback to direct key check
        const directVal = product[key];
        if (directVal !== undefined && directVal !== null) {
            if (typeof directVal === 'object' && 'value' in directVal) {
                return directVal.value ?? "";
            }
            return directVal;
        }
        return "";
    };


    return {
        id: product.id?.toString() || "",
        title,
        handle,
        brand,
        tags,
        images: allImages,
        featuredImage: allImages[0],
        price: sellingPrice,
        compareAtPrice: comparePrice,
        discountPercentage: discountPct,
        isSoldOut,
        rating,
        reviewCount,
        deliveryDate,
        top_notes: cleanMetafieldValue(getMeta('top_notes')),
        middle_notes: cleanMetafieldValue(getMeta('middle_notes')),
        base_notes: cleanMetafieldValue(getMeta('base_notes')),
        gender: cleanMetafieldValue(getMeta('gender') || getMeta('ideal_for')),
        size_ml: cleanMetafieldValue(getMeta('size_ml') || getMeta('size')),
        selectedVariantId: product.selectedVariantId || firstVariant?.id || "",
        stock_count,
        productType: cleanCategoryName(product.productType || product.product_type || product.category || ""),
        product_form: product.product_form || product.attributes?.product_form || "",
        bottle_material: product.bottle_material || product.attributes?.bottle_material || "",
        weight: product.weight || product.attributes?.weight || "",
        shipping: product.shipping || product.attributes?.shipping || null,
        isFull: product.isFull || false,
        raw: product
    };
}

/**
 * Converts a NormalizedProduct into the format expected by the Zustand stores 
 * (Cart, Wishlist, Compare).
 */
export function toStoreProduct(product: NormalizedProduct) {
    return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        slug: product.handle,
        price: product.price.toString(),
        discount_price: product.compareAtPrice > product.price ? product.compareAtPrice.toString() : null,
        has_discount: product.compareAtPrice > product.price,
        stock_count: product.stock_count,
        image: product.featuredImage,
        brand: product.brand,
        tags: product.tags || [],
        availableForSale: !product.isSoldOut,
        selectedVariantId: product.selectedVariantId,
        // Comparison fields
        productType: product.productType || "",
        product_form: product.product_form || "",
        bottle_material: product.bottle_material || "",
        gender: product.gender || "",
        size_ml: product.size_ml || "",
        top_notes: product.top_notes || "",
        middle_notes: product.middle_notes || "",
        base_notes: product.base_notes || "",
        rating: product.rating || 0,
        reviewCount: product.reviewCount || 0,
        isFull: product.isFull || false
    };
}

