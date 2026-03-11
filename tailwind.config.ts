import type { Config } from "tailwindcss";

/**
 * Color palette decisions:
 * - Brand: kept from CSS variables (salon-specific via ThemeProvider)
 * - Home page palette: slate-based neutrals for sophistication
 * - Dark mode: enabled via "class" strategy, toggled in navbar
 * - Typography: Geist Sans (body) + Outfit (headings) — both geometric sans
 */

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-outfit)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        "business-display": [
          "var(--font-druk-text-wide)",
          "var(--font-bebas-neue)",
          "var(--font-outfit)",
          "Arial Black",
          "sans-serif",
        ],
        bebas: ["var(--font-bebas-neue)", "var(--font-outfit)", "Arial Black", "sans-serif"],
      },
      colors: {
        page: "var(--color-page-bg)",
        section: "var(--color-section-bg)",
        surface: "var(--color-surface-bg)",
        "surface-border": "var(--color-surface-border)",
        "text-main": "var(--color-text-main)",
        "text-muted": "var(--color-text-muted)",
        brand: "var(--color-brand)",
        "brand-hover": "var(--color-brand-hover)",
        "brand-soft-bg": "var(--color-brand-soft-bg)",
        "brand-soft-text": "var(--color-brand-soft-text)",
        "biz-surface": "var(--business-surface)",
        "biz-blush-rose": "var(--business-blush-rose)",
        "biz-cherry-blossom": "var(--business-cherry-blossom)",
        "biz-sky-surge": "var(--business-sky-surge)",
        "biz-barbie-pink": "var(--business-barbie-pink)",
        "biz-alabaster-grey": "var(--business-alabaster-grey)",
        "biz-yellow": "var(--business-yellow)",
        "biz-heading-dark": "var(--business-heading-dark)",
        "biz-cta-primary": "var(--business-cta-primary)",
        "biz-cta-hover": "var(--business-cta-hover)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "0 25px 50px rgba(15, 23, 42, 0.15)",
        glow: "0 0 40px rgba(var(--color-brand-rgb, 37 99 235) / 0.15)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.7s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
