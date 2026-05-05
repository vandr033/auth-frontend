"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Loader2, ShoppingBag } from "lucide-react";

import { useAuth } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { notify } from "@/lib/notify";
import { buildSignInRedirectPath } from "@/app/lib/shop-context";
import { listMyCommerceOrders } from "@/app/shop/lib/commerceApi";
import type { PublicCommerceOrder } from "@/app/shop/lib/commerceApi";

function formatCurrency(value: number | null | undefined) {
    if (value == null) return "N/A";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "BOB", // Assuming BOB or use locale format
        maximumFractionDigits: 2,
    }).format(value);
}

function OrdersPageContent() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const params = useParams();
    const shopSlug = typeof params?.slug === "string" ? params.slug : "";
    const { loading: authLoading, isAuthenticated } = useAuth();

    const [loadingData, setLoadingData] = useState(true);
    const [orders, setOrders] = useState<PublicCommerceOrder[]>([]);

    const fetchData = useCallback(async () => {
        if (!shopSlug) return;
        setLoadingData(true);
        try {
            const data = await listMyCommerceOrders(shopSlug);
            setOrders(data);
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("common.error"));
            setOrders([]);
        } finally {
            setLoadingData(false);
        }
    }, [shopSlug, t]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push(buildSignInRedirectPath("/me/orders", shopSlug));
            return;
        }

        if (isAuthenticated && shopSlug) {
            void fetchData();
        }
    }, [authLoading, fetchData, isAuthenticated, router, shopSlug]);

    if (authLoading || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page text-text-main">
            <div className="mx-auto max-w-4xl px-4 py-10">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-main">
                            {t("shopNav.myOrders")}
                        </h1>
                        <p className="text-text-muted">Revisa el historial de tus pedidos</p>
                    </div>

                    {shopSlug ? (
                        <Button asChild variant="outline">
                            <Link href={`/shop/${shopSlug}`}>{t("shopStore.backToStore")}</Link>
                        </Button>
                    ) : null}
                </div>

                {orders.length === 0 ? (
                    <div className="rounded-xl border border-surface-border bg-surface p-8 text-center shadow-card">
                        <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-text-muted/60" />
                        <h2 className="text-lg font-semibold text-text-main">No tienes pedidos</h2>
                        <p className="mt-2 text-sm text-text-muted">Aún no has realizado pedidos en esta tienda.</p>
                        <div className="mt-5">
                            {shopSlug ? (
                                <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                                    <Link href={`/shop/${shopSlug}/store`}>
                                        Ir a la tienda
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const detailHref = `/shop/${shopSlug}/me/orders/${order.order_number}`;

                            return (
                                <article
                                    key={order.id}
                                    className="rounded-xl border border-surface-border bg-surface p-4 shadow-card"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-text-main">
                                                Pedido {order.order_number}
                                            </h3>
                                            <p className="text-sm text-text-muted">
                                                {format(new Date(order.created_at ?? new Date()), "d 'de' MMMM, yyyy", { locale: es })}
                                                {" • "}
                                                {order.items.length} productos
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center rounded-full border bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border-emerald-200">
                                            {t(`shopStore.fulfillmentStatuses.${order.fulfillment_status}`) || order.fulfillment_status}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid gap-1 text-sm text-text-muted">
                                        <p>
                                            <span className="font-medium text-text-main">Entrega:</span>{" "}
                                            {order.fulfillment_type === "PICKUP" ? "Retiro en tienda" : "Delivery"}
                                        </p>
                                        <p>
                                            <span className="font-medium text-text-main">Total:</span>{" "}
                                            {formatCurrency(order.total)}
                                        </p>
                                        <p>
                                            <span className="font-medium text-text-main">Pago:</span>{" "}
                                            {t(`shopStore.paymentStatuses.${order.payment_status}`) || order.payment_status}
                                        </p>
                                    </div>

                                    <div className="mt-4">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={detailHref}>
                                                Ver detalle
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OrdersPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
            }
        >
            <OrdersPageContent />
        </Suspense>
    );
}
