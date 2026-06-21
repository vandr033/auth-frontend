import {
    DEFAULT_PWA_THEME_COLOR,
    FALLBACK_PWA_ICONS,
    getShopBrandingForPwa,
} from "@/lib/pwa/shopBranding";

type ManifestIcon = {
    src: string;
    sizes: string;
    type: "image/png";
    purpose?: "any" | "maskable" | "any maskable";
};

type ShopManifestResponse = {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: "standalone";
    background_color: string;
    theme_color: string;
    icons: ManifestIcon[];
};

type RouteContext = {
    params: Promise<{
        shopSlug: string;
    }>;
};

export async function GET(_: Request, { params }: RouteContext) {
    const { shopSlug } = await params;

    if (!shopSlug) {
        return Response.json({ error: "Missing shop slug" }, { status: 400 });
    }

    const shop = await getShopBrandingForPwa(shopSlug);

    const generatedIconBase = `/shop-manifest/${encodeURIComponent(shop.slug)}/icon`;
    const icons: ManifestIcon[] = shop.logoUrl
        ? [
              { src: `${generatedIconBase}/192`, sizes: "192x192", type: "image/png", purpose: "any maskable" },
              { src: `${generatedIconBase}/512`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ]
        : FALLBACK_PWA_ICONS;

    const manifest: ShopManifestResponse = {
        name: `${shop.name} - By PriConPri`,
        short_name: shop.name,
        start_url: `/shop/${shop.slug}`,
        scope: `/shop/${shop.slug}`,
        display: "standalone",
        background_color: shop.themeColor || DEFAULT_PWA_THEME_COLOR,
        theme_color: shop.themeColor || DEFAULT_PWA_THEME_COLOR,
        icons,
    };

    return new Response(JSON.stringify(manifest), {
        headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
    });
}
