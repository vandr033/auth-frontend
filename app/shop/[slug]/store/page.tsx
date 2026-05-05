"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StoreProductCard } from "@/components/shop/commerce/StoreProductCard";
import {
    getPublicCommerceStore,
    type PublicCommerceStoreResponse,
} from "@/app/shop/lib/commerceApi";
import { useShop } from "../../contexts/ShopContext";
import { useCommerceCart } from "@/app/shop/lib/useCommerceCart";
import { ShopUnavailableState } from "../../components/ShopUnavailableState";
import { useT } from "@/lib/i18n";

export default function StoreCatalogPage() {
    const {
        company: shopCompany,
        slug,
        loading,
        error,
        isShopActive,
    } = useShop();
    const t = useT();
    const { totalItems } = useCommerceCart(slug);
    const [categoryId, setCategoryId] = React.useState<string>("all");
    const [catalog, setCatalog] = React.useState<PublicCommerceStoreResponse | null>(null);
    const [catalogLoading, setCatalogLoading] = React.useState(true);
    const [catalogError, setCatalogError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        const loadCatalog = async () => {
            try {
                setCatalogLoading(true);
                setCatalogError(null);
                const data = await getPublicCommerceStore(slug);
                if (cancelled) return;
                setCatalog(data);
            } catch (loadError) {
                if (cancelled) return;
                setCatalog(null);
                setCatalogError(
                    loadError instanceof Error
                        ? loadError.message
                        : t("shopStore.catalogUnavailable"),
                );
            } finally {
                if (!cancelled) {
                    setCatalogLoading(false);
                }
            }
        };

        void loadCatalog();

        return () => {
            cancelled = true;
        };
    }, [slug, t]);

    const company = shopCompany ?? catalog?.company ?? null;
    const commerceCategories = React.useMemo(
        () => catalog?.categories ?? [],
        [catalog],
    );
    const commerceProducts = React.useMemo(
        () => catalog?.products ?? [],
        [catalog],
    );

    const filteredProducts = React.useMemo(() => {
        if (categoryId === "all") return commerceProducts;
        return commerceProducts.filter((product) => product.category_id === categoryId);
    }, [categoryId, commerceProducts]);

    if ((loading && !company) || (catalogLoading && !catalog)) {
        return <main className="flex min-h-screen items-center justify-center bg-page text-text-main">{t("shopStore.loadingStore")}</main>;
    }

    if (catalogError || !catalog || !company) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-page text-text-main">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">{t("shopHome.shopNotFound")}</h1>
                    <p className="mt-2 text-text-muted">
                        {catalogError || error || t("shopStore.catalogUnavailable")}
                    </p>
                </div>
            </main>
        );
    }

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    return (
        <main className="min-h-screen bg-page text-text-main">
            <section className="border-b border-surface-border bg-surface">
                <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 md:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                                {company.name}
                            </p>
                            <h1 className="mt-2 font-heading text-4xl font-semibold">{t("shopStore.title")}</h1>
                            <p className="mt-3 max-w-2xl text-text-muted">
                                {t("shopStore.subtitle")}
                            </p>
                        </div>
                        <Link href={`/shop/${slug}/store/cart`}>
                            <Button className="bg-brand text-white hover:bg-brand-hover">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                {t("shopStore.cartButton", { count: totalItems })}
                            </Button>
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={categoryId === "all" ? "default" : "outline"}
                            className={categoryId === "all" ? "bg-brand text-white hover:bg-brand-hover" : ""}
                            onClick={() => setCategoryId("all")}
                        >
                            {t("shopStore.allCategories")}
                        </Button>
                        {commerceCategories.map((category) => (
                            <Button
                                key={category.id}
                                variant={categoryId === category.id ? "default" : "outline"}
                                className={categoryId === category.id ? "bg-brand text-white hover:bg-brand-hover" : ""}
                                onClick={() => setCategoryId(category.id)}
                            >
                                {category.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
                {filteredProducts.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-surface-border bg-surface p-10 text-center text-text-muted">
                        {t("shopStore.emptyCategory")}
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.map((product) => (
                            <StoreProductCard
                                key={product.id}
                                slug={slug}
                                product={product}
                                currency={company.currency}
                                contextProducts={commerceProducts}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
