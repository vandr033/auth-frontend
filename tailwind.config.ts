import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
