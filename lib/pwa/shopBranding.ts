import { getImageUrl } from "@/utils/image-url";

export const DEFAULT_PWA_THEME_COLOR = "#e73886";

export const FALLBACK_PWA_ICONS = [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" as const },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" as const },
];

export const FALLBACK_APPLE_TOUCH_ICON = "/icons/icon-192.png";

type ShopApiResponse = {
    data?: {
        company?: {
            name?: string;
            slug?: string;
            logo_url?: string | null;
        };
        theme?: {
            brand_color?: string;
        };
    };
};

export type ShopPwaBranding = {
    slug: string;
    name: string;
    logoUrl: string | null;
    themeColor: string;
};

function resolveApiBaseUrl(): string {
    return (
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:3001/api"
    );
}

function resolveApiUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${resolveApiBaseUrl()}${path}`;
}

function withResizeParams(url: string, size: 180 | 192 | 512): string {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${size}&h=${size}&fit=contain`;
}

export function getSizedShopIcon(logoUrl: string | null, size: 180 | 192 | 512): string {
    if (!logoUrl) {
        if (size === 192) return FALLBACK_PWA_ICONS[0].src;
        if (size === 512) return FALLBACK_PWA_ICONS[1].src;
        return FALLBACK_APPLE_TOUCH_ICON;
    }
    return withResizeParams(logoUrl, size);
}

export async function getShopBrandingForPwa(shopSlug: string): Promise<ShopPwaBranding> {
    const safeSlug = shopSlug.trim();
    const fallback: ShopPwaBranding = {
        slug: safeSlug,
        name: safeSlug || "PriConPri",
        logoUrl: null,
        themeColor: DEFAULT_PWA_THEME_COLOR,
    };

    if (!safeSlug) return fallback;

    try {
        const response = await fetch(resolveApiUrl(`/company/${encodeURIComponent(safeSlug)}`), {
            cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as ShopApiResponse;

        if (!response.ok || !payload?.data) return fallback;

        const company = payload.data.company ?? {};
        const theme = payload.data.theme ?? {};
        const rawName = typeof company.name === "string" ? company.name.trim() : "";
        const rawSlug = typeof company.slug === "string" ? company.slug.trim() : "";
        const rawLogo = typeof company.logo_url === "string" ? company.logo_url.trim() : "";
        const rawThemeColor = typeof theme.brand_color === "string" ? theme.brand_color.trim() : "";

        return {
            slug: rawSlug || safeSlug,
            name: rawName || safeSlug,
            logoUrl: getImageUrl(rawLogo) || null,
            themeColor: rawThemeColor || DEFAULT_PWA_THEME_COLOR,
        };
    } catch {
        return fallback;
    }
}
