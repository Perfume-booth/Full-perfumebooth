export const SITE_NAME = "Perfume Booth";
export const SITE_TAGLINE = "Live Love In Full Bloom";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.perfumebooth.com";

export const COMPANY = {
  name: "PerfumeBooth Pvt. Ltd.",
  address: "70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015",
  phone1: "011-46604937",
  phone2: "+91 9266030909",
  whatsapp: "9266030909",
  email1: "admin@perfumebooth.com",
  email2: "connect@perfumebooth.com",
  hours: "Mon-Sat, 10:00 AM – 6:00 PM",
};

export const NAV_LINKS = [
  { label: "All ", href: "/all" },
  { label: "MEN", href: "/men" },
  { label: "WOMEN", href: "/women" },
  { label: "BRANDS", href: "#" },
  { label: "SCENT SHOT", href: "/scent-shot" },
  // { label: "SALE", href: "/sale" },
  { label: "NEW", href: "/new" },
];

export const BRAND_SUB_MENU = [
  { label: "Al Haramain", href: "/al-haramain" },
  { label: "Arabiyat Prestige", href: "/arabiyat-prestige" },
  { label: "Lomani", href: "/lomani" },
  { label: "Louis Cardin", href: "/louis-cardin" },
  { label: "MPF", href: "/mpf" },
  { label: "New NB", href: "/new-nb" },
  { label: "Otoori", href: "/otoori" },
  { label: "Swiss Arabian", href: "/swiss-arabian" },
  { label: "Lattafa", href: "/lattafa" },
];



export const ANNOUNCEMENT_MESSAGES = [
  { text: "Monsoon Sale Live! Get Up To 70% OFF", icon: "CloudRain" },
  { text: "Free delivery on prepaid orders", icon: "Truck" },
  { text: "Surprise gift inside", icon: "Gift" },
];

export const TOP_CATEGORIES = [
  {
    label: "Perfumes",
    title: " Exclusive Perfumes",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/perfume.png?v=1778139272",
    href: "/perfumes",
  },
  {
    label: "Attars",
    title: "Pure Attars",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/attar.png?v=1778139272",
    href: "/attars",
  },
  {
    label: "Deodorants",
    title: "Fresh Deodorants",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/deo_888a2919-741e-4acc-a2d1-692e69d8e819.png?v=1778139272",
    href: "/deodorants",
  },
  {
    label: "Gift Sets",
    title: "Perfect Gift Sets",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/gift-sets.png?v=1778139271",
    href: "/gift-sets",
  },
  {
    label: "Scent Shots",
    title: "Try More Fragrances ",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/scent.png?v=1778139274",
    href: "/scent-shot",
  },
  {
    label: "Body Mists",
    title: "Refreshing Mists",
    image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/mist.png?v=1778139272",
    href: "/mist",
  },
];

export const TOP_BRANDS = [
  "Perfume Booth",
  "Arabiyat Prestige",
  "Lomani",
  "Louis Cardin",
  "MPF",
  "New NB",
  "Otoori",
  "Lattafa",
  "Swiss Arabian",
  "Royal Mirage",
  "Anfar",
  "Al Haramain"
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const SHIPPING_COUNTRIES = ["India", "Australia", "United States"];
export const CONCENTRATION_FILTERS = ["EDP", "EDT", "Extrait", "Attar"];
export const FORMAT_FILTERS = ["DEO", "Body Spray"];
export const GENDER_FILTERS = ["Men", "Women", "Unisex"];

export const BRAND_MEDIA: Record<string, { type: "image" | "video", desktopSrc: string, mobileSrc: string }> = {

  // --- SCENT NOTES BANNERS ---
  "oud": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "floral": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "citrus": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "woody": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "aquatic": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "spicy": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "oriental": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "fresh": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },
  "unisex": { type: "image", desktopSrc: "/images/fallback-luxury.svg", mobileSrc: "/images/fallback-luxury.svg" },


  // --- DEFAULT FALLBACK ---
  "default": { type: "image", desktopSrc: "", mobileSrc: "" }
};

export const SORT_OPTIONS = [
  { label: "Featured", value: "featured", sortKey: "COLLECTION_DEFAULT", reverse: false },
  { label: "Newest", value: "newest", sortKey: "CREATED", reverse: true },
  { label: "Price: Low to High", value: "price-asc", sortKey: "PRICE", reverse: false },
  { label: "Price: High to Low", value: "price-desc", sortKey: "PRICE", reverse: true },
  { label: "Trending", value: "trending", sortKey: "BEST_SELLING", reverse: false },
];

export const INSTAGRAM_POSTS = [
  { id: "ig-1", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/1_937d780d-e810-458e-959a-db88b913959b.webp?v=1778479565", alt: "Exclusive woody fragrance notes", link: "https://www.instagram.com/p/CjK2gGnPStj/" },
  { id: "ig-3", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/16.webp?v=1778479565", alt: "Bright citrus perfume vibes", link: "https://www.instagram.com/p/Bzc9V8wB8sX/" },
  { id: "ig-4", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/15.webp?v=1778479566", alt: "Grounded earthy woody notes", link: "https://www.instagram.com/p/B2-7YyYFKpG/" },
  { id: "ig-5", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/2_24d003cb-398d-4149-bfaa-626d30dc7dfc.webp?v=1778479565", alt: "Cool aquatic fragrance lifestyle", link: "https://www.instagram.com/p/CZ8uCIJlK7z/" },
  { id: "ig-6", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/17.webp?v=1778479565", alt: "Bold and intriguing spicy scents", link: "https://www.instagram.com/perfumeboothindia/" },
  { id: "ig-7", image: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/New_NB_Red_A_Premium_Quality_Perfume_WithFragrance-_Lemon_Rose_Orange_Blossom_Amber_Wood.webp?v=1782801488", alt: "Bold and intriguing spicy scents", link: "https://www.instagram.com/p/CfVzjYxlesn/" },
];
