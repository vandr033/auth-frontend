"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";

import { PaymentProofUploader } from "@/app/shop/components/commerce/PaymentProofUploader";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";
import { notify } from "@/lib/notify";
import {
    getPublicCommerceOrder,
    type PublicCommerceOrderLookupResponse,
    type PublicCommerceOrderItem,
    submitPublicCommercePaymentProof,
    uploadPublicCommercePaymentProof,
} from "@/app/shop/lib/commerceApi";
import { useShop } from "../../../../contexts/ShopContext";
import { getImageUrl } from "@/utils/image-url";
import { useT } from "@/lib/i18n";

function translatePaymentStatus(status: string | null | undefined, t: ReturnType<typeof useT>) {
    const key = status ? `shopStore.paymentStatuses.${status}` : "shopStore.paymentStatuses.PENDING";
    const translated = t(key);
    return translated === key ? status ?? t("shopStore.paymentStatuses.PENDING") : translated;
}

function translateFulfillmentStatus(status: string | null | undefined, t: ReturnType<typeof useT>) {
    const key = status ? `shopStore.fulfillmentStatuses.${status}` : "shopStore.fulfillmentStatuses.PENDING";
    const translated = t(key);
    return translated === key ? status ?? t("shopStore.fulfillmentStatuses.PENDING") : translated;
}

function translatePaymentMethod(method: string | null | undefined, t: ReturnType<typeof useT>) {
    const key = method ? `shopStore.paymentMethods.${method}` : "";
    const translated = key ? t(key) : "";
    return key && translated !== key ? translated : method ?? t("adminStore.orders.notDefined");
}

export default function StoreOrderStatusPage() {
    const t = useT();
    const params = useParams<{ orderNumber: string }>();
    const searchParams = useSearchParams();
    const orderNumber = params?.orderNumber ?? "";
    const accessToken = searchParams?.get("token") ?? "";
    const { slug, company: shopCompany } = useShop();
    const [orderLookup, setOrderLookup] = React.useState<PublicCommerceOrderLookupResponse | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [uploading, setUploading] = React.useState(false);
    const [proofFile, setProofFile] = React.useState<File | null>(null);
    const [proofError, setProofError] = React.useState<string | null>(null);

    const refreshOrder = React.useCallback(async () => {
        try {
            setLoading(true);
            if (!orderNumber) return;
            const data = await getPublicCommerceOrder(slug, orderNumber, accessToken || null);
            setOrderLookup(data);
        } catch (error) {
            notify.error(error instanceof Error ? error.message : t("shopStore.orderNotFound"));
        } finally {
            setLoading(false);
        }
    }, [accessToken, orderNumber, slug, t]);

    React.useEffect(() => {
        void refreshOrder();
    }, [refreshOrder]);

    const order = orderLookup?.order ?? null;
    const company = orderLookup?.company ?? shopCompany;

    if (loading && !order) {
        return <main className="flex min-h-screen items-center justify-center bg-page text-text-main">{t("shopStore.loadingOrder")}</main>;
    }

    if (!orderLookup || !order || !company) {
        return <main className="flex min-h-screen items-center justify-center bg-page text-text-main">{t("shopStore.orderNotFound")}</main>;
    }

    const canUploadProof =
        (order.payment_method === "QR" || order.payment_method === "MANUAL") &&
        (
            order.payment_status === "PAYMENT_REJECTED" ||
            (!order.payment_proof_url && order.payment_status === "AWAITING_PAYMENT")
        );

    return (
        <main className="min-h-screen bg-page text-text-main">
            <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
                <div className="rounded-3xl border border-surface-border bg-surface p-6 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                        {t("shopStore.orderStatusTitle", { orderNumber: order.order_number })}
                    </p>
                    <h1 className="mt-2 font-heading text-4xl font-semibold">{order.customer_name}</h1>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-page p-4">
                            <p className="text-sm text-text-muted">{t("shopStore.paymentStatus")}</p>
                            <p className="mt-2 text-lg font-semibold">{translatePaymentStatus(order.payment_status, t)}</p>
                        </div>
                        <div className="rounded-2xl bg-page p-4">
                            <p className="text-sm text-text-muted">{t("shopStore.paymentMethod")}</p>
                            <p className="mt-2 text-lg font-semibold">{translatePaymentMethod(order.payment_method, t)}</p>
                        </div>
                        <div className="rounded-2xl bg-page p-4">
                            <p className="text-sm text-text-muted">{t("shopStore.orderStatus")}</p>
                            <p className="mt-2 text-lg font-semibold">{translateFulfillmentStatus(order.fulfillment_status, t)}</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-page p-4">
                        <p className="text-sm text-text-muted">{t("shopStore.summary")}</p>
                        <div className="mt-3 space-y-2 text-sm">
                            {order.items.map((item: PublicCommerceOrderItem) => (
                                <div key={item.id} className="flex items-center justify-between gap-3">
                                    <span>{item.quantity} x {item.product_name_snapshot}</span>
                                    <span>{formatCurrencyAmount(item.total, company.currency)}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between border-t border-surface-border pt-3 font-semibold">
                                <span>{t("shopStore.total")}</span>
                                <span>{order.total != null ? formatCurrencyAmount(order.total, company.currency) : t("shopStore.pendingConfirmation")}</span>
                            </div>
                        </div>
                    </div>

                    {order.payment_method === "CASH" ? (
                        <div className="mt-6 rounded-2xl bg-page p-4 text-sm text-text-muted">
                            {t("shopStore.cashPendingHelp")}
                        </div>
                    ) : null}

                    {order.payment_method === "QR" && orderLookup.store.qr_image_url ? (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-surface-border bg-page p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={getImageUrl(orderLookup.store.qr_image_url) || orderLookup.store.qr_image_url}
                                alt={t("shopStore.qrImageAlt")}
                                className="mx-auto max-h-64 rounded-xl object-contain"
                            />
                        </div>
                    ) : order.payment_method === "QR" ? (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {t("shopStore.qrUnavailable")}
                        </div>
                    ) : null}

                    {order.payment_method !== "CASH" && orderLookup.store.payment_instructions ? (
                        <div className="mt-6 rounded-2xl bg-page p-4">
                            <p className="text-sm text-text-muted">{t("shopStore.paymentInstructions")}</p>
                            <p className="mt-2 text-sm">{orderLookup.store.payment_instructions}</p>
                        </div>
                    ) : null}

                    {order.payment_status === "AWAITING_DELIVERY_COST" ? (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {t("shopStore.manualDeliveryCostPending")}
                        </div>
                    ) : null}

                    {canUploadProof ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-surface-border p-4">
                            <p className="text-sm font-medium">
                                {order.payment_method === "QR" ? t("shopStore.uploadQrProof") : t("shopStore.uploadProof")}
                            </p>
                            <p className="mt-1 text-sm text-text-muted">
                                {order.payment_status === "PAYMENT_REJECTED"
                                    ? t("shopStore.rejectedProofHelp")
                                    : t("shopStore.awaitingTotalHelp")}
                            </p>
                            <div className="mt-4 space-y-4">
                                <PaymentProofUploader
                                    id="order-payment-proof"
                                    label={t("shopStore.uploadProof")}
                                    acceptedTypesLabel={t("shopStore.acceptedProofTypes")}
                                    emptyHelpText={t("shopStore.proofRequiredHelp")}
                                    changeLabel={t("shopStore.changeProof")}
                                    removeLabel={t("shopStore.removeProof")}
                                    file={proofFile}
                                    error={proofError}
                                    disabled={uploading}
                                    onFileChange={(file) => {
                                        setProofFile(file);
                                        setProofError(null);
                                    }}
                                />

                                <Button
                                    type="button"
                                    className="bg-brand text-white hover:bg-brand-hover"
                                    disabled={uploading}
                                    onClick={() => {
                                        if (!proofFile || !company) {
                                            setProofError(t("shopStore.proofRequiredBeforeSend"));
                                            return;
                                        }

                                        void (async () => {
                                            try {
                                                setUploading(true);
                                                setProofError(null);
                                                const upload = await uploadPublicCommercePaymentProof(
                                                    slug,
                                                    order.order_number,
                                                    proofFile,
                                                    accessToken || null,
                                                );
                                                await submitPublicCommercePaymentProof(
                                                    slug,
                                                    order.order_number,
                                                    upload.url,
                                                    accessToken || null,
                                                );
                                                setProofFile(null);
                                                notify.success(t("shopStore.proofSent"));
                                                await refreshOrder();
                                            } catch (error) {
                                                notify.error(error instanceof Error ? error.message : t("shopStore.proofSendFailed"));
                                            } finally {
                                                setUploading(false);
                                            }
                                        })();
                                    }}
                                >
                                    {uploading ? t("shopStore.uploadingProof") : t("shopStore.sendProof")}
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {order.payment_proof_url ? (
                        <div className="mt-6">
                            <Button asChild variant="outline">
                                <a href={order.payment_proof_url} target="_blank" rel="noreferrer">{t("shopStore.viewSubmittedProof")}</a>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
