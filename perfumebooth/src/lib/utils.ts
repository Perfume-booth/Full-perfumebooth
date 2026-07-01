import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = "INR"): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function calculateDiscountPercentage(original: number, sale: number): number {
    if (original <= 0) return 0;
    return Math.round(((original - sale) / original) * 100);
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w ]+/g, "")
        .replace(/ +/g, "-");
}

export function buildShopifyQuery(collection: string, brands: string[], types: string[], minPrice: number, maxPrice: number): string {
  const queryParts = [`collection:${collection}`];
  
  if (brands.length > 0) {
    const brandQuery = brands.map(b => `vendor:"${b}"`).join(" OR ");
    queryParts.push(`(${brandQuery})`);
  }
  
  if (types.length > 0) {
    const typeQuery = types.map(t => `product_type:"${t}"`).join(" OR ");
    queryParts.push(`(${typeQuery})`);
  }
  
  queryParts.push(`variants.price:>=${minPrice}`);
  queryParts.push(`variants.price:<=${maxPrice}`);
  
  return queryParts.join(" AND ");
}

export function stripHtml(html: string): string {
    if (!html) return "";
    return html
        .replace(/<[^>]*>?/gm, "") // Remove HTML tags
        .replace(/&nbsp;/g, " ")     // Replace &nbsp; with space
        .replace(/&amp;/g, "&")      // Replace &amp; with &
        .replace(/&quot;/g, '"')     // Replace &quot; with "
        .replace(/&#39;/g, "'")      // Replace &#39; with '
        .replace(/\s+/g, " ")        // Replace multiple spaces/newlines with single space
        .trim();
}
