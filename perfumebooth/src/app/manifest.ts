import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Perfume Booth | Exclusive Fragrances",
    short_name: "PerfumeBooth",
    description: "Premium fragrance e-commerce platform for Exclusive scents.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1410",
    theme_color: "#b8924a",
    icons: [
      {
        src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/android-chrome-192x192.png?v=1778479434",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "https://cdn.shopify.com/s/files/1/0718/5786/4996/files/android-chrome-512x512.png?v=1778479436",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
