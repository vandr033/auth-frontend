import type { Metadata } from "next";
import { ShopProvider } from "../contexts/ShopContext";
import { ShopNavbar } from "../components/ShopNavbar";
import {
    normalizeShopData,
    resolvePublicApiUrl,
    type ShopApiResponse,
} from "../lib/shopData";
import type { ShopData } from "@/types/shop";
import { getShopBrandingForPwa, getSizedShopIcon } from "@/lib/pwa/shopBranding";

type ShopLayoutProps = {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
    const { slug } = await params;
    const branding = await getShopBrandingForPwa(slug);
    const appleIconUrl = branding.logoUrl ? getSizedShopIcon(branding.logoUrl, 180) : "/icons/icon-192.png";
    const appleIconSize = branding.logoUrl ? "180x180" : "192x192";

    return {
        title: `${branding.name} - By PriConPri`,
        manifest: `/api/manifest/${encodeURIComponent(branding.slug)}.json`,
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: `${branding.name} - By PriConPri`,
        },
        icons: {
            icon: [
                { url: getSizedShopIcon(branding.logoUrl, 192), sizes: "192x192", type: "image/png" },
                { url: getSizedShopIcon(branding.logoUrl, 512), sizes: "512x512", type: "image/png" },
            ],
            apple: [{ url: appleIconUrl, sizes: appleIconSize, type: "image/png" }],
        },
    };
}

async function preloadShopData(slug: string): Promise<{
    initialData: ShopData | null;
    initialError: string | null;
}> {
    try {
        const response = await fetch(resolvePublicApiUrl(`/company/${slug}`), {
            cache: "no-store",
        });
        const result = (await response.json()) as ShopApiResponse;

        if (!response.ok || result.error || !result.data) {
            return {
                initialData: null,
                initialError: null,
            };
        }

        return {
            initialData: normalizeShopData(result.data),
            initialError: null,
        };
    } catch {
        return {
            initialData: null,
            initialError: null,
        };
    }
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
    const { slug } = await params;
    const { initialData, initialError } = await preloadShopData(slug);

    return (
        <ShopProvider
            key={slug}
            slug={slug}
            initialData={initialData}
            initialError={initialError}
        >
            <ShopNavbar />
            {children}
        </ShopProvider>
    );
}
