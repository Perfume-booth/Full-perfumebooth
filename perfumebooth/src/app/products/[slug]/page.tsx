import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { shopifyFetch, getProductRecommendations } from '@/lib/shopify';
import { stripHtml } from '@/lib/utils';
import { getProductByHandleQuery } from '@/lib/queries';
import { METAFIELD_MAPPINGS } from '@/lib/metafields.config';
import { parseRating, getBrandFromTags, cleanMetafieldValue } from '@/lib/transformers';
import ProductGallery from "@/components/product/ProductGallery";
import ProductDetailsClient from "@/components/product/ProductDetailsClient";
import ProductReviews from "@/components/product/ProductReviews";
import RelatedProducts from "@/components/product/RelatedProducts";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import ExpandableNarrative from "@/components/product/ExpandableNarrative";
// @ts-ignore: side-effect import for CSS without type declarations
import './pdp.css';

// Preserving API_URL for mocked recommendation array bindings
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ProductImage {
    id: number;
    image: string;
    alt_text: string;
}

export interface Product {
    category: string | undefined;
    productType: string | undefined;
    tags: string[];
    vendor: string;
    compare_at_price: any;
    id: number | string;
    title: string;
    slug: string;
    brand: string;
    tagline: string;
    description: string;
    price: string;
    discount_price: string | null;
    has_discount: boolean;
    stock_count: number;
    top_notes: string;
    middle_notes: string;
    base_notes: string;
    longevity: string;
    sillage: string;
    size_ml: number;
    is_scent_shot: boolean;
    whats_inside: { name: string; sub: string }[];
    ingredients: string;
    image: string | null;
    images: ProductImage[];
    created_at: string;
    updated_at: string;
    ideal_for?: string;
    fragrance_type?: string;
    origin_country?: string;
    concentration?: string;
    gender?: string;
    type?: string;
    season?: string;
    occasion?: string;
    material?: string;
    fragrance?: string;
    rating?: number;
    rating_count?: number;
    reviewsHtml?: string;
    availableForSale?: boolean;
    variants?: { id?: string; title: string; price: number | string }[];
    coupons?: { code: string; label: string; description: string }[];
}

// Force re-render to pick up new metafield config
async function getProduct(slug: string): Promise<Product | null> {
    const { status, body } = await shopifyFetch<any>({
        query: getProductByHandleQuery,
        variables: { handle: slug }
    });

    if (status !== 200 || !body || !body.data || !body.data.product) {
        return null;
    }

    const p = body.data.product;

    // 1. Safe Image Mapping
    const images = p.images?.edges?.map((edge: any, i: number) => ({
        id: i,
        image: edge.node.url,
        alt_text: edge.node.altText || p.title
    })) || [];

    // 2. Safe Variant Mapping
    const mappedVariants = p.variants?.edges?.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.price.amount
    })) || [];

    const price = p.priceRange?.minVariantPrice?.amount || "0";

    // Detect if whats_inside is a stringified JSON array
    let parsedWhatsInside: any[] = [];
    try {
        if (p.whats_inside?.value) {
            const raw = JSON.parse(p.whats_inside.value);
            if (Array.isArray(raw)) {
                parsedWhatsInside = typeof raw[0] === 'string'
                    ? raw.map((str: string) => ({ name: str, sub: '' }))
                    : raw; // Assume it's an object array { name, sub }
            }
        }
    } catch (e) { }

    // Parse Rating safely using centralized utility
    let { rating: parsedRating, reviewCount: parsedRatingCount } = parseRating(p);

    // Fetch live from Judge.me API if tokens exist
    try {
        const jToken = process.env.JUDGEME_PRIVATE_TOKEN || "K-8hpK-mc8LzBUHwKCjZgVNUQZE";
        const jDomain = process.env.SHOPIFY_STORE_DOMAIN || "perfumesbooth.myshopify.com";
        const jUrl = `https://judge.me/api/v1/reviews?api_token=${jToken}&shop_domain=${jDomain}&per_page=100`;
        const jRes = await fetch(jUrl, { next: { revalidate: 60 } });
        if (jRes.ok) {
            const jData = await jRes.json();
            if (jData && Array.isArray(jData.reviews)) {
                const rList = jData.reviews.filter((r: any) => r.product_handle === slug);
                if (rList.length > 0) {
                    const totalRating = rList.reduce((acc: number, r: any) => acc + (r.rating || 5), 0);
                    parsedRating = parseFloat((totalRating / rList.length).toFixed(1));
                    parsedRatingCount = rList.length;
                }
            }
        }
    } catch (e) {
        console.error("Error fetching live Judge.me rating in getProduct:", e);
    }

    // 3. Helper for Robust Metafield Mapping
    const getMetafield = (attr: keyof typeof METAFIELD_MAPPINGS) => {
        const mapping = METAFIELD_MAPPINGS[attr];
        if (!mapping) return null;
        
        // Check primary alias and fallback aliases generated by generateMetafieldFragment
        for (let i = 0; i < mapping.keys.length; i++) {
            const alias = i === 0 ? attr : `${attr}_fallback_${i}`;
            if (p[alias]?.value) return cleanMetafieldValue(p[alias].value);
        }
        return null;
    };

    // 4. Return Mapped Object
    return {
        id: p.id,
        title: p.title,
        slug: p.handle,
        vendor: p.vendor || 'Perfume Booth',
        tags: p.tags || [],
        brand: getBrandFromTags(p.tags) || 'Perfume Booth',
        tagline: getMetafield('tagline') || 'EAU DE PARFUM',
        description: p.descriptionHtml || p.description,
        price: parseFloat(price).toFixed(2),
        compare_at_price: p.compareAtPriceRange?.minVariantPrice?.amount || null,
        discount_price: p.compareAtPriceRange?.minVariantPrice?.amount || null,
        has_discount: !!p.compareAtPriceRange?.minVariantPrice?.amount && parseFloat(p.compareAtPriceRange.minVariantPrice.amount) > parseFloat(price),
        stock_count: (() => {
            const firstVariant = p.variants?.edges?.[0]?.node;
            return firstVariant && typeof firstVariant.quantityAvailable === 'number'
                ? firstVariant.quantityAvailable
                : (p.availableForSale ? 50 : 0);
        })(),
        top_notes: getMetafield('top_notes'),
        middle_notes: getMetafield('middle_notes'),
        base_notes: getMetafield('base_notes'),
        longevity: getMetafield('longevity') || 'Eternal',
        sillage: getMetafield('sillage') || 'Strong',
        ideal_for: getMetafield('ideal_for'),
        size_ml: (() => {
            const rawSize = getMetafield('size');
            if (!rawSize) return "";
            const parsed = parseInt(rawSize);
            return isNaN(parsed) ? "" : parsed;
        })(),
        is_scent_shot: p.title.toLowerCase().includes('scent shot') || p.title.toLowerCase().includes('discovery set'),
        whats_inside: parsedWhatsInside,
        ingredients: getMetafield('ingredients'),
        concentration: p.concentration?.value || getMetafield('concentration'),
        gender: getMetafield('gender') || 'Unisex',
        origin_country: getMetafield('origin_country') || 'India',
        type: p.productType || '',
        season: getMetafield('season'),
        occasion: getMetafield('occasion'),
        material: getMetafield('material'),
        fragrance_type: getMetafield('fragrance_type'),
        fragrance: getMetafield('fragrance'),
        image: images.length > 0 ? images[0].image : null,
        images: images,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        availableForSale: p.availableForSale,
        rating: parsedRating || 0,
        rating_count: parsedRatingCount || 0,
        reviewsHtml: p.judgeme_reviews?.value || '',
        variants: mappedVariants,
        coupons: (() => {
            const raw = getMetafield('coupons');
            if (!raw) return [];
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.map((c: any) => {
                        if (typeof c === 'string') return { code: c, label: 'Special Offer', description: 'Available for this product' };
                        return {
                            code: c.code || '',
                            label: c.label || 'Special Offer',
                            description: c.description || 'Limited time offer'
                        };
                    });
                }
                return [{ code: raw, label: 'Special Offer', description: 'Available for this product' }];
            } catch (e) {
                return [{ code: raw, label: 'Special Offer', description: 'Available for this product' }];
            }
        })()
    } as Product;
}

async function getRecommendedProducts(productId: string): Promise<Product[]> {
    const recommendations = await getProductRecommendations(productId);
    return recommendations
        .filter(p => p.availableForSale) // Only show available products
        .map(p => {
        const { rating: parsedRating, reviewCount: parsedRatingCount } = parseRating(p);

        return {
            id: p.id,
            title: p.title,
            slug: p.handle,
            brand: getBrandFromTags(p.tags) || 'Perfume Booth',
            tags: p.tags || [],
            category : p.productType,
            image: p.featuredImage?.url,
            price: p.priceRange?.minVariantPrice?.amount || "0",
            discount_price: p.compareAtPriceRange?.minVariantPrice?.amount || null,
            has_discount: !!p.compareAtPriceRange?.minVariantPrice?.amount && parseFloat(p.compareAtPriceRange.minVariantPrice.amount) > parseFloat(p.priceRange?.minVariantPrice?.amount || "0"),
            stock_count: (() => {
                const firstVariant = (p as any).variants?.edges?.[0]?.node;
                return firstVariant && typeof firstVariant.quantityAvailable === 'number'
                    ? firstVariant.quantityAvailable
                    : (p.availableForSale ? 50 : 0);
            })(),
            is_scent_shot: p.title.toLowerCase().includes('scent shot'),
            rating: parsedRating || 0,
            rating_count: parsedRatingCount || 0
        };
    }) as unknown as Product[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) return { title: 'Product Not Found' };
    const description = stripHtml(product.description).substring(0, 160) + "...";
    return {
        title: `${product.title} | Perfume Booth`,
        description: description,
        alternates: {
            canonical: `https://www.perfumebooth.com/products/${product.slug}`
        },
        openGraph: {
            title: `${product.title} | The Scent of Silence`,
            description: description,
            images: product.image ? [{ url: product.image }] : [],
        },
    };
}

export default async function ProductPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const fromParam = resolvedSearchParams.from as string | undefined;

    const product = await getProduct(slug);

    if (!product) notFound();

    const relatedProducts = await getRecommendedProducts(product.id as string);

    const brandName = getBrandFromTags(product.tags) || 'Perfume Booth';
    const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-');

    // Build dynamic collection path
    let collectionLabel = '';
    let collectionHref = '';
    
    if (fromParam && fromParam.toLowerCase() !== 'all') {
      const parts = fromParam.split('/');
      const lastPart = parts[parts.length - 1];
      collectionLabel = lastPart
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      collectionHref = `/${fromParam}`;
    }

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        image: product.image,
        description: stripHtml(product.description).substring(0, 160),
        brand: {
            "@type": "Brand",
            name: product.brand
        },
        offers: {
            "@type": "Offer",
            url: `https://www.perfumebooth.com/products/${product.slug}`,
            priceCurrency: "INR",
            price: product.price,
            availability: product.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition"
        }
    };

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.perfumebooth.com"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": collectionLabel || brandName,
                "item": collectionHref ? `https://www.perfumebooth.com${collectionHref}` : `https://www.perfumebooth.com/${brandSlug}`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.title,
                "item": `https://www.perfumebooth.com/products/${product.slug}`
            }
        ]
    };

    return (
        <main className="min-h-screen bg-[var(--color-bg)] pb-0 w-full text-[var(--color-text-primary)] font-sans md:pt-28 overflow-x-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            {/* Breadcrumbs */}
            <div className=" max-w-7xl mx-auto md:py-4 px-4 md:px-6 md:mt-3 text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-semibold border-l-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/5">
                <div className="flex flex-wrap items-center">
                    <Link href="/" className="hover:text-[var(--color-text-primary)] transition-colors">Home</Link>
                    <span className="mx-2 md:mx-3 opacity-50">/</span>
                    {collectionLabel ? (
                        <>
                            <Link href={collectionHref} className="hover:text-[var(--color-text-primary)] transition-colors">{collectionLabel}</Link>
                            <span className="mx-2 md:mx-3 opacity-50">/</span>
                        </>
                    ) : (
                        <>
                            <Link href={`/${brandSlug}`} className="hover:text-[var(--color-text-primary)] transition-colors">{brandName}</Link>
                            <span className="mx-2 md:mx-3 opacity-50">/</span>
                        </>
                    )}
                    <span className="text-[var(--color-text-primary)] truncate max-w-[150px] md:max-w-none">{product.title}</span>
                </div>
            </div>

            {/* Layout Container */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* Left Column Stack (Gallery + Narrative) */}
                    <div className="contents lg:flex lg:flex-col lg:col-span-7 gap-8 lg:gap-12">
                        {/* 1. Gallery - Always Top */}
                        <div className="w-full h-fit order-1">
                            <ProductGallery images={product.images} title={product.title} />
                        </div>

                        {/* 3. Narrative - 3rd on Mobile, Below Gallery on Desktop */}
                        <div className="w-full h-fit order-3">
                            <article className="max-w-2xl md:border-l border-none md:border-[var(--color-gold)]/20 pl-0 md:pl-8 py-4">
                                <ExpandableNarrative 
                                    description={product.description} 
                                    details={{
                                        fragrance: product.fragrance || product.title,
                                        gender: product.gender,
                                        season: product.season,
                                        idealFor: product.ideal_for,
                                        size: `${product.size_ml}ml`,
                                        type: product.type,
                                        occasion: product.occasion,
                                    }}
                                />
                            </article>
                        </div>
                    </div>

                    {/* 2. Details - 2nd on Mobile, Sticky Right on Desktop */}
                    <div className="lg:col-span-5 lg:col-start-8 w-full order-2">
                        <div className="lg:sticky lg:top-32 h-fit">
                            <ProductDetailsClient product={product} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <ProductReviews productHandle={product.slug} />
            </div>

            {/* Product Discovery Sections */}
            <div className="w-full mt-12">
                <RecentlyViewed currentProductId={product.id} />
                <RelatedProducts products={relatedProducts} />
            </div>
        </main>
    );
}