import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-text-primary)",
        gold: {
          DEFAULT: "var(--color-gold)",
          light: "var(--color-gold-light)",
          dark: "var(--color-gold-dark)",
        },
        maroon: {
          DEFAULT: "var(--color-maroon)",
          light: "var(--color-maroon-light)",
        },
        purple: "var(--color-purple)",
        amber: "var(--color-amber)",
        emerald: "var(--color-emerald)",
        sale: "var(--color-sale)",
        "sale-bg": "var(--color-sale-bg)",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Inter", "sans-serif"],
        serif: ["Georgia", "Playfair Display", "serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        drawer: "var(--shadow-drawer)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.65, 0, 0.35, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        std: "var(--transition-std)",
        drawer: "var(--transition-drawer)",
      },
    },
  },
  plugins: [],
};

export default config;
