export type PageBackgroundPreset = "light" | "soft" | "dark" | "auto";
export type FontPreset = "modern" | "rounded" | "heritage";

export type ThemeConfig = {
  brandColor: string;
  pageBackgroundColor: string;
  pageBackgroundPreset: PageBackgroundPreset;
  cardsElevated: boolean;
  cornerRadius: "sm" | "md" | "lg";
  fontPreset: FontPreset;
  fontPairing?: string;
};

export type ComputedTheme = {
  mode: "light" | "dark";
  tokens: {
    pageBg: string;
    sectionBg: string;
    surfaceBg: string;
    surfaceBorder: string;
    textMain: string;
    textMuted: string;
    brand: string;
    brandHover: string;
    brandSoftBg: string;
    brandSoftText: string;
    cardShadow: string;
    radiusSm: string;
    radiusMd: string;
    radiusLg: string;
    fontFamily: string;
    fontHeading?: string;
    fontBody?: string;
    cssVars: Record<string, string>;
  };
};

type RGB = { r: number; g: number; b: number };
type HSL = { h: number; s: number; l: number };
type ColorMetrics = { hex: string; rgb: RGB; hsl: HSL; luminance: number };

type TokenPalette = Omit<ComputedTheme["tokens"], "cssVars">;

const colorCache = new Map<string, ColorMetrics>();
const radiusScale: Record<ThemeConfig["cornerRadius"], { sm: string; md: string; lg: string }> = {
  sm: { sm: "0.25rem", md: "0.375rem", lg: "0.5rem" },
  md: { sm: "0.375rem", md: "0.75rem", lg: "1rem" },
  lg: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
};
const fontStacks: Record<FontPreset, string> = {
  modern: `var(--font-geist-sans), "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`,
  rounded: `"Nunito", "Quicksand", "Nunito Sans", system-ui, sans-serif`,
  heritage: `"Playfair Display", "Georgia", "Times New Roman", serif`,
};

// Font pairing system: heading + body font pairs
export const fontPairingMap: Record<string, { heading: string; body: string }> = {
  default: {
    heading: `var(--font-outfit), "Outfit", system-ui, sans-serif`,
    body: `var(--font-geist-sans), "Geist Sans", system-ui, sans-serif`,
  },
  classic:  {
    heading: `var(--font-playfair-display), "Playfair Display", Georgia, serif`,
    body: `var(--font-inter), "Inter", system-ui, sans-serif`,
  },
  modern:   {
    heading: `var(--font-space-grotesk), "Space Grotesk", system-ui, sans-serif`,
    body: `var(--font-dm-sans), "DM Sans", system-ui, sans-serif`,
  },
  bold:     {
    heading: `var(--font-bebas-neue), "Bebas Neue", Impact, sans-serif`,
    body: `var(--font-roboto), "Roboto", system-ui, sans-serif`,
  },
  refined:  {
    heading: `var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif`,
    body: `var(--font-lato), "Lato", system-ui, sans-serif`,
  },
  friendly: {
    heading: `var(--font-nunito), "Nunito", system-ui, sans-serif`,
    body: `var(--font-nunito-sans), "Nunito Sans", system-ui, sans-serif`,
  },
};

/* ---------- low-level helpers ---------- */

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function normalizeHex(hex: string): string {
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((ch) => ch + ch)
      .join("")}`.toLowerCase();
  }
  if (cleaned.length !== 6) {
    throw new Error(`Invalid hex color "${hex}"`);
  }
  return `#${cleaned.toLowerCase()}`;
}

function hexToRgb(hex: string): RGB {
  const normalized = normalizeHex(hex);
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

const hslToHex = (h: number, s: number, l: number) => {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

function luminanceFromRgb({ r, g, b }: RGB): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function getColorMetrics(hex: string): ColorMetrics {
  const normalized = normalizeHex(hex);
  const cached = colorCache.get(normalized);
  if (cached) {
    return cached;
  }

  const rgb = hexToRgb(normalized);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const metrics: ColorMetrics = {
    hex: normalized,
    rgb,
    hsl,
    luminance: luminanceFromRgb(rgb),
  };
  colorCache.set(normalized, metrics);
  return metrics;
}

const getLuminance = (hex: string) => getColorMetrics(hex).luminance;

function adjustLightness(hex: string, delta: number): string {
  const { h, s, l } = getColorMetrics(hex).hsl;
  return hslToHex(h, s, clamp01(l + delta));
}

function setLightnessFromHue(hex: string, targetL: number, targetS?: number): string {
  const { h, s } = getColorMetrics(hex).hsl;
  const l = clamp01(targetL);
  const sat = typeof targetS === "number" ? targetS : s;
  return hslToHex(h, sat, l);
}

const withAlpha = (hex: string, alpha: number) => {
  const { rgb } = getColorMetrics(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const resolvePreset = (
  preset: PageBackgroundPreset,
  baseLuminance: number,
): Exclude<PageBackgroundPreset, "auto"> => {
  if (preset === "auto") {
    return baseLuminance > 0.6 ? "light" : "dark";
  }
  return preset;
};

const buildCssVars = (palette: TokenPalette) => ({
  "--color-page-bg": palette.pageBg,
  "--color-section-bg": palette.sectionBg,
  "--color-surface-bg": palette.surfaceBg,
  "--color-surface-border": palette.surfaceBorder,

  "--color-text-main": palette.textMain,
  "--color-text-muted": palette.textMuted,

  "--color-brand": palette.brand,
  "--color-brand-hover": palette.brandHover,
  "--color-brand-soft-bg": palette.brandSoftBg,
  "--color-brand-soft-text": palette.brandSoftText,

  "--shadow-card": palette.cardShadow,

  "--radius-sm": palette.radiusSm,
  "--radius-md": palette.radiusMd,
  "--radius-lg": palette.radiusLg,
  "--font-family-base": palette.fontFamily,
  "--font-heading": palette.fontHeading || palette.fontFamily,
  "--font-body": palette.fontBody || palette.fontFamily,
});

/* ---------- main theme generator ---------- */

export function computeTheme(config: ThemeConfig): ComputedTheme {
  const {
    brandColor,
    pageBackgroundColor,
    pageBackgroundPreset,
    cardsElevated,
    cornerRadius,
    fontPreset,
    fontPairing,
  } = config;

  const preset = resolvePreset(pageBackgroundPreset, getLuminance(pageBackgroundColor));
  const pageBg =
    preset === "light"
      ? setLightnessFromHue(pageBackgroundColor, 0.96, 0.15)
      : preset === "soft"
        ? setLightnessFromHue(pageBackgroundColor, 0.93, 0.25)
        : setLightnessFromHue(pageBackgroundColor, 0.08, 0.35);

  const mode: "light" | "dark" = getLuminance(pageBg) > 0.5 ? "light" : "dark";
  const sectionBg = mode === "light" ? adjustLightness(pageBg, -0.02) : adjustLightness(pageBg, 0.04);
  const surfaceBg = mode === "light" ? "#ffffff" : adjustLightness(pageBg, 0.08);
  const surfaceBorder = mode === "light" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)";
  const textMain = mode === "light" ? "#0f172a" : "#f9fafb";
  const textMuted = mode === "light" ? "#6b7280" : "rgba(249,250,251,0.7)";

  const brandBase = getColorMetrics(brandColor).hex;
  const brandHover = mode === "light" ? adjustLightness(brandBase, -0.06) : adjustLightness(brandBase, 0.06);
  const brandSoftBg = mode === "light" ? withAlpha(brandBase, 0.12) : withAlpha("#ffffff", 0.06);
  const brandSoftText = mode === "light" ? brandBase : "#e5e7eb";

  const radii = radiusScale[cornerRadius];
  const fontFamily = fontStacks[fontPreset];
  const cardShadow =
    cardsElevated && mode === "light"
      ? "0 18px 30px rgba(15,23,42,0.08)"
      : cardsElevated
        ? "0 18px 30px rgba(0,0,0,0.6)"
        : "none";

  // Resolve font pairing for heading/body fonts
  const pairing = fontPairing ? fontPairingMap[fontPairing] : undefined;

  const palette: TokenPalette = {
    pageBg,
    sectionBg,
    surfaceBg,
    surfaceBorder,
    textMain,
    textMuted,
    brand: brandBase,
    brandHover,
    brandSoftBg,
    brandSoftText,
    cardShadow,
    radiusSm: radii.sm,
    radiusMd: radii.md,
    radiusLg: radii.lg,
    fontFamily,
    fontHeading: pairing?.heading,
    fontBody: pairing?.body,
  };

  return {
    mode,
    tokens: {
      ...palette,
      cssVars: buildCssVars(palette),
    },
  };
}
