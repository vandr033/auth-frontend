import { ShopProvider } from "../contexts/ShopContext";
import { ShopNavbar } from "../components/ShopNavbar";
import {
    normalizeShopData,
    resolvePublicApiUrl,
    type ShopApiResponse,
} from "../lib/shopData";
import type { ShopData } from "@/types/shop";

type ShopLayoutProps = {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
};

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
