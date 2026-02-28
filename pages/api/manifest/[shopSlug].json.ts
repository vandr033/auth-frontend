import type { NextApiRequest, NextApiResponse } from "next";
import {
    DEFAULT_PWA_THEME_COLOR,
    FALLBACK_PWA_ICONS,
    getShopBrandingForPwa,
    getSizedShopIcon,
} from "@/lib/pwa/shopBranding";

type ManifestIcon = {
    src: string;
    sizes: string;
    type: "image/png";
};

type ShopManifestResponse = {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: "standalone";
    background_color: "#ffffff";
    theme_color: string;
    icons: ManifestIcon[];
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ShopManifestResponse | { error: string }>,
) {
    const slugParam = req.query.shopSlug;
    const shopSlug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

    if (!shopSlug) {
        res.status(400).json({ error: "Missing shop slug" });
        return;
    }

    const shop = await getShopBrandingForPwa(shopSlug);

    const icons: ManifestIcon[] = shop.logoUrl
        ? [
              { src: getSizedShopIcon(shop.logoUrl, 192), sizes: "192x192", type: "image/png" },
              { src: getSizedShopIcon(shop.logoUrl, 512), sizes: "512x512", type: "image/png" },
          ]
        : FALLBACK_PWA_ICONS;

    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.status(200).json({
        name: `${shop.name} — Reservas`,
        short_name: shop.name,
        start_url: `/shop/${shop.slug}`,
        scope: `/shop/${shop.slug}`,
        display: "standalone",
        background_color: "#ffffff",
        theme_color: shop.themeColor || DEFAULT_PWA_THEME_COLOR,
        icons,
    });
}
