"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { buildSignInRedirectPath } from "@/app/lib/shop-context";
import { getMyCommerceOrder } from "@/app/shop/lib/commerceApi";
import type { PublicCommerceOrderLookupResponse } from "@/app/shop/lib/commerceApi";

function formatCurrency(value: number | null | undefined) {
    if (value == null) return "N/A";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "BOB", // Assuming BOB or use locale format
        maximumFractionDigits: 2,
    }).format(value);
}

function OrderDetailPageContent() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const params = useParams();
    const shopSlug = typeof params?.slug === "string" ? params.slug : "";
    const orderNumber = typeof params?.orderNumber === "string" ? params.orderNumber : "";
    const { loading: authLoading, isAuthenticated } = useAuth();

    const [loadingData, setLoadingData] = useState(true);
    const [orderData, setOrderData] = useState<PublicCommerceOrderLookupResponse | null>(null);

    const fetchData = useCallback(async () => {
        if (!shopSlug || !orderNumber) return;
        setLoadingData(true);
        try {
            const data = await getMyCommerceOrder(shopSlug, orderNumber);
            setOrderData(data);
        } catch (err) {
            await notify.error(err instanceof Error ? err.message : t("common.error"));
            setOrderData(null);
        } finally {
            setLoadingData(false);
        }
    }, [shopSlug, orderNumber, t]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push(buildSignInRedirectPath(`/me/orders/${orderNumber}`, shopSlug));
            return;
        }

        if (isAuthenticated && shopSlug && orderNumber) {
            void fetchData();
        }
    }, [authLoading, fetchData, isAuthenticated, router, shopSlug, orderNumber]);

    if (authLoading || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
                <p className="text-text-muted">No encontramos el pedido o no tienes acceso.</p>
            </div>
        );
    }

    const { order } = orderData;

    return (
        <div className="min-h-screen bg-page text-text-main">
            <div className="mx-auto max-w-4xl px-4 py-10">
                <div className="mb-6 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-text-main">
                        Pedido {order.order_number}
                    </h1>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <section className="rounded-xl border border-surface-border bg-surface p-6 shadow-card">
                        <h2 className="mb-4 text-lg font-semibold text-text-main">Detalles</h2>
                        <div className="space-y-3 text-sm text-text-muted">
                            <div className="flex justify-between">
                                <span>Estado:</span>
                                <span className="font-medium text-text-main">
                                    {t(`shopStore.fulfillmentStatuses.${order.fulfillment_status}`) || order.fulfillment_status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pago:</span>
                                <span className="font-medium text-text-main">
                                    {t(`shopStore.paymentStatuses.${order.payment_status}`) || order.payment_status}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-surface-border pt-3">
                                <span className="font-bold text-text-main">Total:</span>
                                <span className="font-bold text-text-main">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>
                        </div>
                        {order.payment_proof_url ? (
                            <div className="mt-4 border-t border-surface-border pt-4">
                                <a
                                    href={order.payment_proof_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium text-brand hover:underline"
                                >
                                    Ver comprobante enviado
                                </a>
                            </div>
                        ) : null}
                    </section>

                    <section className="rounded-xl border border-surface-border bg-surface p-6 shadow-card">
                        <h2 className="mb-4 text-lg font-semibold text-text-main">Productos</h2>
                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <div>
                                        <p className="font-medium text-text-main">
                                            {item.product_name_snapshot}
                                        </p>
                                        <p className="text-text-muted">x {item.quantity}</p>
                                    </div>
                                    <p className="font-medium text-text-main">
                                        {formatCurrency(item.total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand" />
                </div>
            }
        >
            <OrderDetailPageContent />
        </Suspense>
    );
}
