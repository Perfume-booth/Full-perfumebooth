export interface ProductImage {
    url: string;
    altText?: string;
    width?: number;
    height?: number;
}

export interface ProductVariant {
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number;
    available: boolean;
    sku?: string;
}

export interface Product {
    stock_count: number;
    rating: number;
    rating_count?: number;
    id: string;
    handle: string;
    slug?: string;
    title: string;
    description?: string;
    images: ProductImage[];
    variants: ProductVariant[]; // Extended JSON from Django (e.g. [{ title: "50ML", price: 150 }])
    tags: string[];
    brand?: string;
    tag?: string;
    vendor?: string;
    productType: string;
    product_form?: string;
    bottle_material?: string;
    ideal_for?: string;
    fragrance_type?: string;
    origin_country?: string;
    availableForSale: boolean;
    top_notes?: string;
    middle_notes?: string;
    base_notes?: string;
    gender?: string;
    size_ml?: string | number;
    size?: string;
    price?: string | number;
    image?: string;
    discount_price?: string | null;
    has_discount?: boolean;
    compareAtPriceRange?: {
        minVariantPrice: number;
        maxVariantPrice: number;
    };
    priceRange: {
        minVariantPrice: number;
        maxVariantPrice: number;
    };
    metafields?: Record<string, string>;
    isFull?: boolean;
}

export interface ProductCardProps {
    product: Product;
    showBadge?: boolean;
    showActions?: boolean;
}
