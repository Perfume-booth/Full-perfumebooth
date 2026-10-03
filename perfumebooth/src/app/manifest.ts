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
        src: "/favicon.ico",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
