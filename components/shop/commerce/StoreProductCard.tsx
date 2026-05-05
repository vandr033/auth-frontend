"use client";

import Link from "next/link";
import { BadgePercent, Box, Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { ShopCommerceProduct } from "@/types/shop";
import { getImageUrl } from "@/utils/image-url";

type StoreProductCardProps = {
    slug: string;
    product: ShopCommerceProduct;
    currency?: string | null;
    actionLabel?: string;
    contextProducts?: ShopCommerceProduct[];
};

function resolveProductImage(product: ShopCommerceProduct, contextProducts?: ShopCommerceProduct[]): string | null {
    if (product.images?.length) {
        const primary = product.images.find((image) => image.is_primary) ?? product.images[0];
        return getImageUrl(primary?.image_url);
    }
    
    // For combos, try to find an image from components
    if (product.product_type === "COMBO" && product.combo_items?.length && contextProducts) {
        for (const item of product.combo_items) {
            const contextProduct = contextProducts.find((p) => p.id === item.component_product?.id);
            if (contextProduct?.images?.length) {
                const primary = contextProduct.images.find((img) => img.is_primary) ?? contextProduct.images[0];
                return getImageUrl(primary?.image_url);
            }
        }
    }
    
    return null;
}

export function StoreProductCard({
    slug,
    product,
    currency,
    actionLabel,
    contextProducts,
}: StoreProductCardProps) {
    const t = useT();
    const imageUrl = resolveProductImage(product, contextProducts);
    const finalPrice = product.pricing?.final_price ?? product.price;
    const isPromo = Boolean(product.pricing?.promo_applied);
    const comparisonPrice = isPromo
        ? product.pricing?.regular_price ?? product.pricing?.base_price ?? product.price
        : product.pricing?.regular_price ?? product.regular_price ?? null;
    const isCombo = product.product_type === "COMBO";
    const resolvedActionLabel = actionLabel ?? t("shopStore.viewProduct");

    return (
        <article className="overflow-hidden rounded-3xl border border-surface-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-xl">
            <Link href={`/shop/${slug}/store/${product.slug}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden bg-brand-soft-bg">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand-soft-bg text-brand">
                            <Package2 className="h-10 w-10" />
                        </div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        {isPromo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand shadow-sm">
                                <BadgePercent className="h-3.5 w-3.5" />
                                {t("shopStore.promoBadge")}
                            </span>
                        ) : null}
                        {isCombo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                <Box className="h-3.5 w-3.5" />
                                {t("shopStore.comboBadge")}
                            </span>
                        ) : null}
                    </div>
                </div>
            </Link>

            <div className="space-y-4 p-5">
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                        {product.category?.name ?? t("shopStore.categoryFallback")}
                    </p>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-heading text-xl font-semibold text-text-main">
                                {product.name}
                            </h3>
                            {product.description ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-muted">
                                    {product.description}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1">
                        {comparisonPrice != null && comparisonPrice > finalPrice ? (
                            <p className="text-sm text-text-muted line-through">
                                {formatCurrencyAmount(comparisonPrice, currency)}
                            </p>
                        ) : null}
                        <p className="text-xl font-bold text-text-main">
                            {formatCurrencyAmount(finalPrice, currency)}
                        </p>
                        {product.track_stock && !product.allow_out_of_stock_orders ? (
                            <p className="text-xs text-text-muted">
                                {t("shopStore.stock", {
                                    count:
                                        isCombo && product.combo_available_units != null
                                            ? product.combo_available_units
                                            : product.stock_quantity,
                                })}
                            </p>
                        ) : null}
                    </div>

                    <Link href={`/shop/${slug}/store/${product.slug}`}>
                        <Button className="bg-brand text-white hover:bg-brand-hover">
                            {resolvedActionLabel}
                        </Button>
                    </Link>
                </div>
            </div>
        </article>
    );
}
