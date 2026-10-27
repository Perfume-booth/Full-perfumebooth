import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProductRecommendations } from '@/lib/catalog';
import { stripHtml } from '@/lib/utils';
import { METAFIELD_MAPPINGS } from '@/lib/product-fields.config';
import { parseRating, getBrandFromTags, cleanMetafieldValue } from '@/lib/transformers';
import { cleanImageUrl as normalizeMediaUrl } from '@/lib/media-url';
import { availableUnits, catalogAvailable } from '@/lib/catalog-availability';
import ProductGallery from "@/components/product/ProductGallery";
import { ProductVariantProvider, ProductVariantSelector } from "@/components/product/ProductVariantContext";
import ProductDetailsClient from "@/components/product/ProductDetailsClient";
import ProductReviews from "@/components/product/ProductReviews";
import RelatedProducts from "@/components/product/RelatedProducts";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import ExpandableNarrative from "@/components/product/ExpandableNarrative";
import { FaqSection } from "@/components/ui/faq-section";
import ProductBreadcrumbs from "@/components/product/ProductBreadcrumbs";
import { Suspense } from "react";
// @ts-ignore: side-effect import for CSS without type declarations
import './pdp.css';

// Cache PDP on server for 15 minutes via ISR
export const revalidate = 900;

// Public API URL used for server-side product requests.
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
    barcode?: string;
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
    bottle_material?: string;
    product_form?: string;
    fragrance?: string;
    rating?: number;
    rating_count?: number;
    reviewsHtml?: string;
    availableForSale?: boolean;
    variants?: {
        id?: string;
        title: string;
        option1_name?: string;
        option1_value?: string;
        option2_name?: string;
        option2_value?: string;
        sku?: string;
        barcode?: string;
        price: number | string;
        compareAtPrice?: string;
        cost_price?: string;
        weight?: string;
        dimensions?: string;
        is_default?: boolean;
        availableForSale?: boolean;
        quantityAvailable?: number;
        requiresShipping?: boolean;
        image?: string | null;
    }[];
    coupons?: { code: string; label: string; description: string }[];
}

// Server-side fetching
function cleanImageUrl(url: string | null | undefined): string | null {
    return normalizeMediaUrl(url) ?? null;
}

async function getProduct(slug: string): Promise<Product | null> {
    try {
        const isDocker = process.env.WATCHPACK_POLLING === "true";
        const API_URL = isDocker ? 'http://django:8000' : 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/shop/products/${slug}/`, {
            cache: 'no-store'
        });
        if (!res.ok) return null;
        const rawJson = await res.json();
        const p = (rawJson && typeof rawJson === 'object' && 'data' in rawJson && 'meta' in rawJson) ? rawJson.data : rawJson;
        if (!p) return null;

        const images = p.images?.map((img: any, i: number) => ({
            id: i,
            image: cleanImageUrl(img.url || img.image) || '',
            alt_text: img.altText || img.alt_text || p.title
        })) || [];

        const mainImgUrl = cleanImageUrl(p.image);
        if (mainImgUrl) {
            const existingIdx = images.findIndex((img: any) => img.image === mainImgUrl);
            if (existingIdx > 0) {
                const [item] = images.splice(existingIdx, 1);
                images.unshift(item);
            } else if (existingIdx === -1) {
                images.unshift({
                    id: 0,
                    image: mainImgUrl,
                    alt_text: p.title
                });
            }
        }

        // Append any variant images that are not yet in the gallery
        if (Array.isArray(p.variants)) {
            p.variants.forEach((v: any, vIdx: number) => {
                const vImg = cleanImageUrl(v.image);
                if (vImg && !images.some((img: any) => img.image === vImg)) {
                    images.push({
                        id: images.length + vIdx + 1,
                        image: vImg,
                        alt_text: `${p.title} - ${v.title || v.option1_value || 'Variant'}`
                    });
                }
            });
        }

        const priceVal = parseFloat(p.price || "0").toFixed(2);
        const comparePriceVal = p.compare_at_price ? parseFloat(p.compare_at_price).toFixed(2) : undefined;

        return {
            ...p,
            image: cleanImageUrl(p.image) || (images.length > 0 ? images[0].image : null),
            images: images,
            stock_count: availableUnits(p),
            availableForSale: catalogAvailable(p),
            rating: p.rating || 4.5,
            rating_count: p.rating_count || 0,
            reviewsHtml: '',
            variants: p.variants?.length ? p.variants.map((variant: any) => ({
                id: String(variant.id),
                title: variant.title || variant.option1_value || "Default Title",
                option1_name: variant.option1_name,
                option1_value: variant.option1_value,
                option2_name: variant.option2_name,
                option2_value: variant.option2_value,
                sku: variant.sku,
                barcode: variant.barcode,
                price: String(variant.price),
                compareAtPrice: variant.compare_at_price ? String(variant.compare_at_price) : undefined,
                cost_price: variant.cost_price ? String(variant.cost_price) : undefined,
                weight: variant.weight,
                dimensions: variant.dimensions,
                is_default: Boolean(variant.is_default),
                availableForSale: Boolean(p.is_online) && variant.is_active !== false && availableUnits(variant) > 0,
                quantityAvailable: availableUnits(variant),
                requiresShipping: true,
                image: cleanImageUrl(variant.image) || (images.length > 0 ? images[0].image : null)
            })) : [],
            coupons: []
        };
    } catch (err) {
        console.error("Error fetching product details:", err);
        return null;
    }
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
                category: p.productType,
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
        image: product.images && product.images.length > 0 ? product.images.map(img => img.image) : (product.image ? [product.image] : []),
        description: stripHtml(product.description).substring(0, 160),
        sku: product.variants && product.variants.length > 0 ? product.variants[0].sku : String(product.id),
        mpn: product.variants && product.variants.length > 0 ? product.variants[0].sku : String(product.id),
        gtin: product.barcode || (product.variants && product.variants.length > 0 ? product.variants[0].barcode : undefined),
        barcode: product.barcode || (product.variants && product.variants.length > 0 ? product.variants[0].barcode : undefined),
        url: `https://www.perfumebooth.com/products/${product.slug}`,
        category: product.category || product.type,
        brand: {
            "@type": "Brand",
            name: product.brand
        },
        offers: {
            "@type": "Offer",
            url: `https://www.perfumebooth.com/products/${product.slug}`,
            priceCurrency: "INR",
            price: product.price,
            priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
            availability: product.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: {
                "@type": "Organization",
                name: "Perfume Booth"
            }
        },
        ...(product.rating_count && product.rating_count > 0 ? {
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.rating,
                reviewCount: product.rating_count,
                bestRating: "5",
                worstRating: "1"
            }
        } : {})
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
                "name": brandName,
                "item": `https://www.perfumebooth.com/${brandSlug}`
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
        <main className="min-h-screen bg-[var(--color-bg)] pb-24 md:pb-12 w-full text-[var(--color-text-primary)] font-sans pt-14 md:pt-28 overflow-x-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />

            {/* Breadcrumbs */}
            <div className="hidden md:block">
            <Suspense fallback={
                <div className="max-w-7xl mx-auto md:py-4 px-4 md:px-6 md:mt-3 text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-semibold border-l-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/5">
                    <div className="flex flex-wrap items-center animate-pulse">
                        <span>Home</span>
                        <span className="mx-2 md:mx-3 opacity-50">/</span>
                        <span>{brandName}</span>
                        <span className="mx-2 md:mx-3 opacity-50">/</span>
                        <span className="text-[var(--color-text-primary)] truncate max-w-[150px] md:max-w-none">{product.title}</span>
                    </div>
                </div>
            }>
                <ProductBreadcrumbs brandName={brandName} brandSlug={brandSlug} productTitle={product.title} />
            </Suspense>
            </div>


            {/* Layout Container */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-2 md:pt-3">
                <ProductVariantProvider key={String(product.id)} product={product}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">

                    {/* Left Column Stack (Gallery + Narrative) */}
                    <div className="contents lg:flex lg:flex-col lg:col-span-7 gap-4 lg:gap-6">
                        {/* 1. Gallery - Always Top */}
                        <div className="w-full h-fit order-1">
                            <ProductGallery images={product.images} title={product.title} product={product}>
                                <ProductVariantSelector product={product} />
                            </ProductGallery>
                        </div>

                        {/* 3. Narrative - 3rd on Mobile, Below Gallery on Desktop */}
                        <div className="w-full h-fit order-3">
                            <article className="max-w-2xl md:border-l border-none md:border-[var(--color-gold)]/20 pl-0 md:pl-5 py-2">
                                <ExpandableNarrative
                                    description={product.description}
                                    notes={{
                                        top: product.top_notes,
                                        middle: product.middle_notes,
                                        base: product.base_notes,
                                    }}
                                    details={{
                                        fragrance: product.fragrance || product.title,
                                        gender: product.gender,
                                        season: product.season,
                                        idealFor: product.ideal_for,
                                        size: product.size_ml ? `${product.size_ml}ml` : undefined,
                                        type: product.type,
                                        occasion: product.occasion,
                                        material: product.bottle_material || product.material || (product as any).attributes?.bottle_material,
                                        form: product.product_form || (product as any).attributes?.product_form,
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
                </ProductVariantProvider>
            </div>

            <div className="w-full">
                <ProductReviews productHandle={product.slug} />
            </div>

            <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
                <FaqSection
                    title="Frequently Asked Questions"
                    description="Everything you need to know about our products, authenticity, shipping, and policies."
                    items={[
                        {
                            question: "1. Are all perfumes sold on Perfume Booth authentic?",
                            answer: "Yes. Every product sold on Perfume Booth is 100% authentic and sourced through trusted brands, authorised importers, and verified distribution partners. We do not sell counterfeit, refilled, diluted, or imitation fragrances."
                        },
                        {
                            question: "2. Does Perfume Booth offer Cash on Delivery?",
                            answer: "Yes, Cash on Delivery is available for eligible orders and serviceable PIN codes across India. COD availability and any applicable charges will be clearly displayed during checkout before you place your order."
                        },
                        {
                            question: "3. How quickly will my order be shipped?",
                            answer: "Most confirmed orders are packed and dispatched within 12–24 working hours. Once your order is shipped, tracking details will be shared with you so you can follow its delivery status."
                        },
                        {
                            question: "4. How long does delivery take?",
                            answer: "Most orders are delivered within 2–7 business days, depending on your location and PIN code. Delivery may take slightly longer for remote areas, public holidays, weather disruptions, or courier delays."
                        },
                        {
                            question: "5. What is Perfume Booth’s return and refund policy?",
                            answer: (
                                <span>
                                    You can read our full shipping and return policy{" "}
                                    <Link href="/info/policies/refund" className="underline hover:text-[var(--color-gold)] transition-colors">
                                        here
                                    </Link>
                                    .
                                </span>
                            )
                        }
                    ]}
                />
            </div>

            {/* Product Discovery Sections */}
            <div className="w-full mt-4 md:mt-6">
                <RecentlyViewed currentProductId={product.id} />
                <RelatedProducts products={relatedProducts} />
            </div>
        </main>
    );
}
