"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";
import { getImageUrl } from "@/utils/image-url";
import { useCommerceCart } from "@/app/shop/lib/useCommerceCart";
import { useShop } from "../../../contexts/ShopContext";
import { useT } from "@/lib/i18n";

export default function StoreCartPage() {
    const t = useT();
    const { slug, company } = useShop();
    const { items, subtotal, updateQuantity, removeItem } = useCommerceCart(slug);

    return (
        <main className="min-h-screen bg-page text-text-main">
            <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">{t("shopStore.purchaseLabel")}</p>
                        <h1 className="mt-2 font-heading text-4xl font-semibold">{t("shopStore.cartTitle")}</h1>
                    </div>
                    <Link href={`/shop/${slug}/store`}>
                        <Button variant="outline">{t("shopStore.continueShopping")}</Button>
                    </Link>
                </div>

                {items.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-surface-border bg-surface p-12 text-center">
                        <ShoppingCart className="mx-auto h-10 w-10 text-text-muted" />
                        <p className="mt-4 font-medium text-text-main">{t("shopStore.emptyCartTitle")}</p>
                        <p className="mt-2 text-text-muted">{t("shopStore.emptyCartDescription")}</p>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-4">
                            {items.map((item) => (
                                <article key={item.productId} className="flex gap-4 rounded-3xl border border-surface-border bg-surface p-4 shadow-card">
                                    <div className="h-24 w-24 overflow-hidden rounded-2xl bg-brand-soft-bg">
                                        {item.imageUrl ? (
                                            <img src={getImageUrl(item.imageUrl) ?? ""} alt={item.name} className="h-full w-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="flex flex-1 flex-col gap-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="font-semibold">{item.name}</h2>
                                                <p className="text-sm text-text-muted">
                                                    {formatCurrencyAmount(item.unitPrice, company?.currency)}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" size="icon" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="min-w-8 text-center text-sm font-medium">{item.quantity}</span>
                                            <Button variant="outline" size="icon" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <aside className="rounded-3xl border border-surface-border bg-surface p-6 shadow-card">
                            <p className="text-sm text-text-muted">{t("shopStore.subtotal")}</p>
                            <p className="mt-2 text-3xl font-bold">
                                {formatCurrencyAmount(subtotal, company?.currency)}
                            </p>
                            <p className="mt-3 text-sm text-text-muted">
                                {t("shopStore.deliveryCostHint")}
                            </p>
                            <Link href={`/shop/${slug}/store/checkout`} className="mt-6 block">
                                <Button className="w-full bg-brand text-white hover:bg-brand-hover">
                                    {t("shopStore.checkoutCta")}
                                </Button>
                            </Link>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}
