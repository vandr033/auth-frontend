import { ImageResponse } from "next/og";

import {
    DEFAULT_PWA_THEME_COLOR,
    FALLBACK_APPLE_TOUCH_ICON,
    getShopBrandingForPwa,
} from "@/lib/pwa/shopBranding";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        shopSlug: string;
        size: string;
    }>;
};

const ALLOWED_SIZES = new Set([180, 192, 512]);

function normalizeSize(rawSize: string): 180 | 192 | 512 {
    const parsed = Number.parseInt(rawSize, 10);
    if (ALLOWED_SIZES.has(parsed)) {
        return parsed as 180 | 192 | 512;
    }
    return 192;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            cache: "no-store",
        });

        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") || "image/png";
        const bytes = await response.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
}

export async function GET(_: Request, { params }: RouteContext) {
    const { shopSlug, size: rawSize } = await params;
    const size = normalizeSize(rawSize);
    const branding = await getShopBrandingForPwa(shopSlug);

    const logoDataUrl = branding.logoUrl
        ? await fetchImageAsDataUrl(branding.logoUrl)
        : await fetchImageAsDataUrl(FALLBACK_APPLE_TOUCH_ICON);

    const initials = branding.name.trim().charAt(0).toUpperCase() || "P";

    const image = new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: branding.themeColor || DEFAULT_PWA_THEME_COLOR,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {logoDataUrl ? (
                    <img
                        src={logoDataUrl}
                        alt={branding.name}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            background: branding.themeColor || DEFAULT_PWA_THEME_COLOR,
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: Math.round(size * 0.42),
                            fontWeight: 700,
                        }}
                    >
                        {initials}
                    </div>
                )}
            </div>
        ),
        {
            width: size,
            height: size,
        },
    );

    image.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return image;
}
