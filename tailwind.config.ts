import type { Config } from "tailwindcss";
import { theme } from "./lib/theme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: theme.colors.primary,
        "background-light": theme.colors["background-light"],
        "background-dark": theme.colors["background-dark"],
        "text-light": theme.colors["text-light"],
        "text-dark": theme.colors["text-dark"],
        "border-light": theme.colors["border-light"],
        "border-dark": theme.colors["border-dark"],
        "card-light": theme.colors["card-light"],
        "card-dark": theme.colors["card-dark"],
        "card-hover-light": theme.colors["card-hover-light"],
        "card-hover-dark": theme.colors["card-hover-dark"],
        green: theme.colors.green,
        yellow: theme.colors.yellow,
      },
      fontFamily: {
        display: theme.fontFamily.display,
      },
      borderRadius: {
        DEFAULT: theme.borderRadius.DEFAULT,
        lg: theme.borderRadius.lg,
        xl: theme.borderRadius.xl,
        full: theme.borderRadius.full,
      },
    },
  },
  plugins: [],
};
export default config;
