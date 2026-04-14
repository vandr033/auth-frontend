"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MapPin, Package, ShoppingBag, Truck } from "lucide-react";

import { DeliveryAddressPicker } from "@/components/shop/DeliveryAddressPicker";

import { useShop } from "@/app/shop/contexts/ShopContext";
import { useAuth } from "@/lib/useAuth";
import { useT } from "@/lib/i18n";
import { resolvePublicApiUrl } from "@/app/shop/lib/shopData";
import { formatFixedCurrencyFromCents } from "@/lib/currency";
import { getImageUrl } from "@/utils/image-url";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ShopUnavailableState } from "@/app/shop/components/ShopUnavailableState";

type CartItem = {
    productId: number;
    quantity: number;
};

type CreatedOrder = {
    id: number;
    total_cents: number;
    payment_status: string;
};

type PastOrder = {
    id: number;
    status: string;
    payment_status: string;
    total_cents: number;
    created_at: string;
    fulfillment_type: string;
    order_type: string;
    scheduled_date: string | null;
    items: { id: number; quantity: number; unit_price_cents: number; product_name: string }[];
    company: { id: number; name: string; currency: string };
};

function formatDateLabel(date: Date) {
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function dateToInputValue(date: Date) {
    return date.toISOString().slice(0, 10);
}

export default function ShopStorePage() {
    const { company, slug, commerce, modules, isShopActive, availableUntil } = useShop();
    const { user } = useAuth();
    const t = useT();

    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productDialogId, setProductDialogId] = useState<number | null>(null);
    const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">(
        commerce?.settings.supports_delivery && !commerce?.settings.supports_pickup ? "DELIVERY" : "PICKUP",
    );
    const [orderType, setOrderType] = useState<"ASAP" | "SCHEDULED">(
        commerce?.settings.scheduled_orders_enabled && !commerce?.settings.asap_orders_enabled ? "SCHEDULED" : "ASAP",
    );
    const [pointOfSaleId, setPointOfSaleId] = useState<string>("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTimeframe, setScheduledTimeframe] = useState("");
    const [guestName, setGuestName] = useState(user?.name || "");
    const [guestPhonePrefix, setGuestPhonePrefix] = useState(user?.phone_prefix || company?.phone_prefix || "591");
    const [guestPhone, setGuestPhone] = useState(user?.phoneNumber || "");
    const [guestEmail, setGuestEmail] = useState(user?.email || "");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryInstructions, setDeliveryInstructions] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
    const [checkoutStep, setCheckoutStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<"date" | "name" | "deliveryAddress", string>>>({});
    const [qrProofPreview, setQrProofPreview] = useState<string | null>(null);
    const [qrProofUrl, setQrProofUrl] = useState<string | null>(null);
    const [qrProofUploading, setQrProofUploading] = useState(false);
    const [myOrders, setMyOrders] = useState<PastOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        setOrdersLoading(true);
        fetch(resolvePublicApiUrl("/commerce/my/orders"), { credentials: "include" })
            .then((r) => r.json())
            .then((result: { error?: boolean; data?: PastOrder[] }) => {
                if (!result.error && Array.isArray(result.data)) setMyOrders(result.data);
            })
            .catch(() => undefined)
            .finally(() => setOrdersLoading(false));
    }, [user]);;

    const products = commerce?.products ?? [];
    const categories = commerce?.categories ?? [];
    const pointsOfSale = commerce?.points_of_sale ?? [];
    const deliveryRules = commerce?.delivery_rules ?? [];
    const currency = commerce?.settings.currency ?? company?.currency;
    const formatMoney = (cents: number) => formatFixedCurrencyFromCents(cents, currency);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === "all") return products;
        const category = categories.find((item) => item.slug === selectedCategory);
        return products.filter((product) => product.category_id === category?.id);
    }, [categories, products, selectedCategory]);

    const featuredProducts = useMemo(
        () => products.filter((product) => product.is_featured).slice(0, 4),
        [products],
    );

    const cartEntries = useMemo(() => {
        return cart
            .map((entry) => {
                const product = products.find((item) => item.id === entry.productId);
                if (!product) return null;
                const unitPrice = product.effective_price_cents ?? product.promotional_price_cents ?? product.regular_price_cents;
                return {
                    product,
                    quantity: entry.quantity,
                    subtotal: unitPrice * entry.quantity,
                };
            })
            .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    }, [cart, products]);

    const cartTotal = useMemo(
        () => cartEntries.reduce((sum, entry) => sum + entry.subtotal, 0),
        [cartEntries],
    );

    const activeProduct = useMemo(
        () => products.find((product) => product.id === productDialogId) ?? null,
        [productDialogId, products],
    );

    const availableScheduledDates = useMemo(() => {
        const today = new Date();
        const dates: Date[] = [];

        for (let offset = 0; offset < 14; offset += 1) {
            const candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
            if (fulfillmentType === "DELIVERY") {
                const weekday = candidate.getUTCDay();
                const rule = deliveryRules.find((item) => item.weekday === weekday);
                if (!rule?.delivery_enabled || !rule.scheduled_enabled) continue;
            }
            dates.push(candidate);
        }

        return dates;
    }, [deliveryRules, fulfillmentType]);

    const selectedRule = useMemo(() => {
        if (!scheduledDate || fulfillmentType !== "DELIVERY") return null;
        const selected = new Date(`${scheduledDate}T12:00:00.000Z`);
        return deliveryRules.find((rule) => rule.weekday === selected.getUTCDay()) ?? null;
    }, [deliveryRules, fulfillmentType, scheduledDate]);

    const selectedPoint = useMemo(
        () => pointsOfSale.find((point) => String(point.id) === pointOfSaleId) ?? null,
        [pointOfSaleId, pointsOfSale],
    );

    const scheduledTimeframeOptions = useMemo(() => {
        if (!selectedRule?.windows?.length) return [];
        const slots: string[] = [];
        for (const window of selectedRule.windows) {
            if (window.start_time && window.end_time) {
                const [sh, sm] = window.start_time.split(":").map(Number);
                const [eh, em] = window.end_time.split(":").map(Number);
                let cursor = sh * 60 + (sm || 0);
                const end = eh * 60 + (em || 0);
                while (cursor + 30 <= end) {
                    const fmt = (mins: number) =>
                        `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
                    slots.push(`${fmt(cursor)} - ${fmt(cursor + 30)}`);
                    cursor += 30;
                }
            } else if (window.label) {
                slots.push(window.label);
            }
        }
        return slots;
    }, [selectedRule]);

    function updateCart(productId: number, quantity: number) {
        const product = products.find((p) => p.id === productId);
        const maxQty = product?.stock_quantity ?? Infinity;
        const clamped = Math.min(quantity, maxQty);

        setCart((prev) => {
            if (clamped <= 0) {
                return prev.filter((item) => item.productId !== productId);
            }

            const existing = prev.find((item) => item.productId === productId);
            if (existing) {
                return prev.map((item) => (item.productId === productId ? { ...item, quantity: clamped } : item));
            }

            return [...prev, { productId, quantity: clamped }];
        });
    }

    async function handleSubmitOrder() {
        if (cartEntries.length === 0) return;

        setSubmitting(true);
        try {
            const response = await fetch(resolvePublicApiUrl(`/commerce/${slug}/orders`), {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    guest_name: guestName,
                    guest_phone_prefix: guestPhonePrefix,
                    guest_phone: guestPhone,
                    guest_email: guestEmail,
                    fulfillment_type: fulfillmentType,
                    order_type: orderType,
                    point_of_sale_id: pointOfSaleId ? Number(pointOfSaleId) : null,
                    scheduled_date: orderType === "SCHEDULED" ? scheduledDate : null,
                    scheduled_timeframe: orderType === "SCHEDULED" ? scheduledTimeframe || null : null,
                    delivery_address: fulfillmentType === "DELIVERY" ? deliveryAddress : null,
                    delivery_instructions: fulfillmentType === "DELIVERY" ? deliveryInstructions : null,
                    qr_proof_image_url: qrProofUrl,
                    notes,
                    items: cartEntries.map((entry) => ({
                        product_id: entry.product.id,
                        quantity: entry.quantity,
                    })),
                }),
            });

            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.message || "Unable to create order");
            }

            setCreatedOrder({
                id: result.data.id,
                total_cents: result.data.total_cents,
                payment_status: result.data.payment_status,
            });
            setCart([]);
            setScheduledDate("");
            setScheduledTimeframe("");
            setDeliveryAddress("");
            setDeliveryInstructions("");
            setNotes("");
            setQrProofPreview(null);
            setQrProofUrl(null);
            setCheckoutStep(1);
            await notify.success("Order placed! We'll contact you to confirm your order.");
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : "Unable to create order");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleQrProofFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file || !company) return;

        // Local preview immediately
        const reader = new FileReader();
        reader.onload = (e) => setQrProofPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        // Upload to backend
        setQrProofUploading(true);
        setQrProofUrl(null);
        try {
            const formData = new FormData();
            formData.append("image", file);
            formData.append("company_id", String(company.id));

            const response = await fetch(resolvePublicApiUrl("/upload/qr"), {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const result = await response.json() as { error: boolean; data?: { url: string }; message?: string };
            if (!response.ok || result.error || !result.data?.url) {
                throw new Error(result.message ?? "Upload failed");
            }

            setQrProofUrl(result.data.url);
        } catch {
            setQrProofPreview(null);
            await notify.error("Could not upload proof. Please try again.");
        } finally {
            setQrProofUploading(false);
        }
    }

    function handleAdvanceStep() {
        const errors: typeof fieldErrors = {};

        if (checkoutStep === 2 && orderType === "SCHEDULED" && !scheduledDate) {
            errors.date = "Choose a date to continue.";
        }
        if (checkoutStep === 3) {
            if (!guestName.trim()) errors.name = "Your name is required.";
            if (fulfillmentType === "DELIVERY" && !deliveryAddress.trim()) {
                errors.deliveryAddress = "Add your delivery address to continue.";
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setCheckoutStep((s) => Math.min(s + 1, 4));
    }

    function handleFulfillmentChange(type: "PICKUP" | "DELIVERY") {
        setFulfillmentType(type);
        setPointOfSaleId("");
    }

    if (!isShopActive) {
        return <ShopUnavailableState slug={slug} />;
    }

    if (!company || !modules.store || !commerce?.settings.store_enabled) {
        return (
            <main className="min-h-[70vh] bg-page px-4 py-16 text-text-main">
                <div className="mx-auto max-w-3xl rounded-3xl border border-surface-border bg-surface p-10 text-center shadow-card">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-text-muted">
                        {company?.name ?? "Store"}
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight">Store not available</h1>
                    <p className="mt-4 text-text-muted">
                        This company does not have a published product storefront yet.
                    </p>
                    <div className="mt-8">
                        <Button asChild className="bg-brand text-white hover:bg-brand-hover">
                            <a href={`/shop/${slug}`}>{t("shopNav.home")}</a>
                        </Button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <>
            <main className="bg-page pb-20">
                <section className="border-b border-surface-border bg-section">
                    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                                {company.name}
                            </p>
                            <h1 className="mt-3 text-4xl font-bold tracking-tight text-text-main md:text-5xl">
                                {commerce.settings.hero_title || `Store by ${company.name}`}
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
                                {commerce.settings.hero_subtitle ||
                                    "Browse products, choose pickup or delivery, and place your order with QR payment."}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3 text-sm text-text-muted">
                                {commerce.settings.supports_pickup ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-surface-border px-4 py-2">
                                        <Package className="h-4 w-4" />
                                        Pickup available
                                    </span>
                                ) : null}
                                {commerce.settings.supports_delivery ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-surface-border px-4 py-2">
                                        <Truck className="h-4 w-4" />
                                        Delivery available
                                    </span>
                                ) : null}
                                <span className="inline-flex items-center gap-2 rounded-full border border-surface-border px-4 py-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    QR payment only
                                </span>
                            </div>
                        </div>

                        <div className="relative min-h-[240px] overflow-hidden rounded-3xl border border-surface-border bg-surface shadow-card">
                            {commerce.settings.banner_image_url ? (
                                <Image
                                    src={getImageUrl(commerce.settings.banner_image_url) || commerce.settings.banner_image_url}
                                    alt={`${company.name} store banner`}
                                    fill
                                    sizes="(min-width: 1024px) 32rem, 100vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center bg-brand-soft-bg p-8 text-center text-brand">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Storefront</p>
                                        <p className="mt-2 text-lg font-semibold">{company.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_360px] lg:px-6">
                    <section className="space-y-8">
                        {featuredProducts.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold tracking-tight text-text-main">Featured products</h2>
                                    <span className="text-sm text-text-muted">{featuredProducts.length} highlighted</span>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {featuredProducts.map((product) => (
                                        <Card key={product.id} className="overflow-hidden border-surface-border bg-surface shadow-sm">
                                            <div className="relative aspect-[16/10] bg-page">
                                                {product.images[0] ? (
                                                    <Image
                                                        src={getImageUrl(product.images[0]) || product.images[0]}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(min-width: 768px) 24rem, 100vw"
                                                        className="object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <CardContent className="space-y-3 p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-text-main">{product.name}</h3>
                                                        {product.is_combo ? (
                                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                                                                Combo
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="text-right">
                                                        {product.promotion_active && product.promotional_price_cents ? (
                                                            <p className="text-xs text-text-muted line-through">
                                                                {formatMoney(product.regular_price_cents)}
                                                            </p>
                                                        ) : null}
                                                        <p className="text-lg font-semibold text-text-main">
                                                            {formatMoney(
                                                                product.effective_price_cents ?? product.promotional_price_cents ?? product.regular_price_cents,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Button
                                                        variant="outline"
                                                        className="border-surface-border"
                                                        onClick={() => setProductDialogId(product.id)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button
                                                        className="bg-brand text-white hover:bg-brand-hover"
                                                        disabled={(cart.find((item) => item.productId === product.id)?.quantity || 0) >= product.stock_quantity}
                                                        onClick={() => updateCart(product.id, (cart.find((item) => item.productId === product.id)?.quantity || 0) + 1)}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory("all")}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                        selectedCategory === "all"
                                            ? "bg-brand text-white"
                                            : "border border-surface-border bg-surface text-text-main"
                                    }`}
                                >
                                    All
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(category.slug)}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                            selectedCategory === category.slug
                                                ? "bg-brand text-white"
                                                : "border border-surface-border bg-surface text-text-main"
                                        }`}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filteredProducts.map((product) => {
                                    const quantityInCart = cart.find((item) => item.productId === product.id)?.quantity || 0;
                                    return (
                                        <Card key={product.id} className="border-surface-border bg-surface">
                                            <div className="relative aspect-[5/4] overflow-hidden rounded-t-xl bg-page">
                                                {product.images[0] ? (
                                                    <Image
                                                        src={getImageUrl(product.images[0]) || product.images[0]}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
                                                        className="object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <CardContent className="space-y-3 p-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 className="text-lg font-semibold text-text-main">{product.name}</h3>
                                                        <div className="text-right">
                                                            {product.promotion_active && product.promotional_price_cents ? (
                                                                <p className="text-xs text-text-muted line-through">
                                                                    {formatMoney(product.regular_price_cents)}
                                                                </p>
                                                            ) : null}
                                                            <p className="text-base font-semibold text-text-main">
                                                                {formatMoney(
                                                                    product.effective_price_cents ?? product.promotional_price_cents ?? product.regular_price_cents,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="line-clamp-3 text-sm leading-6 text-text-muted">
                                                        {product.description || "No description provided yet."}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-text-muted">
                                                    <span>{product.stock_quantity} in stock</span>
                                                    {product.is_combo ? <span>Combo</span> : null}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 border-surface-border"
                                                        onClick={() => setProductDialogId(product.id)}
                                                    >
                                                        View
                                                    </Button>
                                                    {quantityInCart > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                className="h-10 w-10 border-surface-border px-0"
                                                                onClick={() => updateCart(product.id, quantityInCart - 1)}
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="w-6 text-center text-sm font-semibold">{quantityInCart}</span>
                                                            <Button
                                                                className="h-10 w-10 bg-brand px-0 text-white hover:bg-brand-hover"
                                                                disabled={quantityInCart >= product.stock_quantity}
                                                                onClick={() => updateCart(product.id, quantityInCart + 1)}
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            className="bg-brand text-white hover:bg-brand-hover"
                                                            onClick={() => updateCart(product.id, 1)}
                                                        >
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        <Card className="border-surface-border bg-surface">
                            <CardHeader>
                                <CardTitle>Pickup and support</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                {pointsOfSale.map((point) => (
                                    <div key={point.id} className="rounded-2xl border border-surface-border bg-page p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-semibold text-text-main">{point.name}</h3>
                                                <p className="text-sm text-text-muted">{point.city}</p>
                                            </div>
                                            <div className="text-right text-xs text-text-muted">
                                                {point.pickup_enabled ? <p>Pickup</p> : null}
                                                {point.delivery_enabled ? <p>Delivery</p> : null}
                                            </div>
                                        </div>
                                        {point.opening_hours_text ? (
                                            <p className="mt-3 text-sm leading-6 text-text-muted">{point.opening_hours_text}</p>
                                        ) : null}
                                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                            {point.osm_link ? (
                                                <a
                                                    href={point.osm_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-brand transition hover:text-brand-hover"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                    Maps
                                                </a>
                                            ) : null}
                                            {point.support_phone ? <span>{point.support_phone}</span> : null}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </section>

                    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        <Card className="border-surface-border bg-surface shadow-card">
                            <CardHeader>
                                <CardTitle>Your order</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {cartEntries.length === 0 ? (
                                    <p className="text-sm text-text-muted">Your cart is empty. Add products to continue.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {cartEntries.map((entry) => (
                                            <div key={entry.product.id} className="rounded-2xl border border-surface-border bg-page p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium text-text-main">{entry.product.name}</p>
                                                        <p className="text-sm text-text-muted">
                                                            {entry.quantity} x{" "}
                                                            {formatMoney(
                                                                entry.product.effective_price_cents ?? entry.product.promotional_price_cents ?? entry.product.regular_price_cents,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold text-text-main">
                                                        {formatMoney(entry.subtotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between border-t border-surface-border pt-3 text-base font-semibold text-text-main">
                                            <span>Total</span>
                                            <span>{formatMoney(cartTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-surface-border bg-surface">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-base leading-snug">
                                        {(["How do you want your order?", "When do you need it?", "Your details", "Review & pay"] as const)[checkoutStep - 1]}
                                    </CardTitle>
                                    <span className="shrink-0 text-xs text-text-muted">{checkoutStep} of 4</span>
                                </div>
                                <div className="mt-2 flex gap-1">
                                    {[1, 2, 3, 4].map((s) => (
                                        <div
                                            key={s}
                                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= checkoutStep ? "bg-brand" : "bg-surface-border"}`}
                                        />
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">

                                {/* Step 1: Fulfillment */}
                                {checkoutStep === 1 && (
                                    <>
                                        {commerce.settings.supports_pickup && commerce.settings.supports_delivery ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFulfillmentChange("PICKUP")}
                                                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition ${fulfillmentType === "PICKUP" ? "border-brand bg-brand-soft-bg text-brand" : "border-surface-border bg-page text-text-muted"}`}
                                                >
                                                    <Package className="h-5 w-5" />
                                                    Pick up at store
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFulfillmentChange("DELIVERY")}
                                                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition ${fulfillmentType === "DELIVERY" ? "border-brand bg-brand-soft-bg text-brand" : "border-surface-border bg-page text-text-muted"}`}
                                                >
                                                    <Truck className="h-5 w-5" />
                                                    Deliver to me
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft-bg p-4 text-sm font-medium text-brand">
                                                {fulfillmentType === "PICKUP" ? <Package className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                                                {fulfillmentType === "PICKUP" ? "Pick up at store" : "Delivery to your address"}
                                            </div>
                                        )}
                                        {pointsOfSale.length > 0 ? (() => {
                                            const filteredPoints = pointsOfSale.filter((point) =>
                                                fulfillmentType === "PICKUP" ? point.pickup_enabled : point.delivery_enabled,
                                            );
                                            return (
                                                <div className="grid gap-2">
                                                    <Label htmlFor="pointOfSale">
                                                        {fulfillmentType === "PICKUP" ? "Pick-up location" : "Delivery area"}
                                                    </Label>
                                                    {filteredPoints.length > 0 ? (
                                                        <select
                                                            id="pointOfSale"
                                                            value={pointOfSaleId}
                                                            onChange={(event) => setPointOfSaleId(event.target.value)}
                                                            className="h-10 rounded-md border border-surface-border bg-page px-3 text-sm text-text-main"
                                                        >
                                                            <option value="">Choose a location</option>
                                                            {filteredPoints.map((point) => (
                                                                <option key={point.id} value={point.id}>
                                                                    {point.name} · {point.city}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <p className="text-sm text-text-muted">
                                                            No {fulfillmentType === "PICKUP" ? "pick-up locations" : "delivery areas"} are available for this option. Try switching to {fulfillmentType === "PICKUP" ? "delivery" : "pick-up"}.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })() : null}
                                    </>
                                )}

                                {/* Step 2: Timing */}
                                {checkoutStep === 2 && (
                                    <>
                                        {commerce.settings.asap_orders_enabled && commerce.settings.scheduled_orders_enabled ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setOrderType("ASAP")}
                                                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition ${orderType === "ASAP" ? "border-brand bg-brand-soft-bg text-brand" : "border-surface-border bg-page text-text-muted"}`}
                                                >
                                                    As soon as possible
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setOrderType("SCHEDULED")}
                                                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-sm font-medium transition ${orderType === "SCHEDULED" ? "border-brand bg-brand-soft-bg text-brand" : "border-surface-border bg-page text-text-muted"}`}
                                                >
                                                    Pick a date
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft-bg p-4 text-sm font-medium text-brand">
                                                {orderType === "ASAP" ? "As soon as possible" : "Scheduled delivery"}
                                            </div>
                                        )}
                                        {orderType === "SCHEDULED" ? (
                                            <>
                                                <div className="grid gap-1.5">
                                                    <Label htmlFor="scheduledDate">Date</Label>
                                                    {availableScheduledDates.length === 0 ? (
                                                        <p className="rounded-xl border border-surface-border bg-page px-3 py-2.5 text-sm text-text-muted">
                                                            No available dates in the next two weeks.{fulfillmentType === "DELIVERY" ? " Delivery may not be set up for any day this period." : ""} Try "As soon as possible" instead.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <select
                                                                id="scheduledDate"
                                                                value={scheduledDate}
                                                                onChange={(event) => { setScheduledDate(event.target.value); setFieldErrors((prev) => ({ ...prev, date: undefined })); }}
                                                                className={`h-10 rounded-md border bg-page px-3 text-sm text-text-main ${fieldErrors.date ? "border-red-400 ring-1 ring-red-400" : "border-surface-border"}`}
                                                            >
                                                                <option value="">Choose a date</option>
                                                                {availableScheduledDates.map((date) => (
                                                                    <option key={dateToInputValue(date)} value={dateToInputValue(date)}>
                                                                        {formatDateLabel(date)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {fieldErrors.date ? (
                                                                <p className="text-xs text-red-500">{fieldErrors.date}</p>
                                                            ) : (
                                                                <p className="text-xs text-text-muted">
                                                                    {fulfillmentType === "DELIVERY"
                                                                        ? "Only days when delivery is available are shown."
                                                                        : "Showing available dates for the next two weeks."}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                {scheduledTimeframeOptions.length > 0 ? (
                                                    <div className="grid gap-1.5">
                                                        <Label htmlFor="timeframe">Time slot</Label>
                                                        <select
                                                            id="timeframe"
                                                            value={scheduledTimeframe}
                                                            onChange={(event) => setScheduledTimeframe(event.target.value)}
                                                            className="h-10 rounded-md border border-surface-border bg-page px-3 text-sm text-text-main"
                                                        >
                                                            <option value="">Choose a time slot</option>
                                                            {scheduledTimeframeOptions.map((slot) => (
                                                                <option key={slot} value={slot}>
                                                                    {slot}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <p className="text-xs text-text-muted">30-minute delivery windows</p>
                                                    </div>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </>
                                )}

                                {/* Step 3: Contact details */}
                                {checkoutStep === 3 && (
                                    <>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="guestName">Your name</Label>
                                            <Input
                                                id="guestName"
                                                value={guestName}
                                                placeholder="Full name"
                                                className={fieldErrors.name ? "border-red-400 ring-1 ring-red-400" : ""}
                                                onChange={(event) => { setGuestName(event.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
                                            />
                                            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
                                        </div>
                                        <div className="grid grid-cols-[100px_1fr] gap-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="guestPhonePrefix">+Code</Label>
                                                <Input
                                                    id="guestPhonePrefix"
                                                    value={guestPhonePrefix}
                                                    placeholder="591"
                                                    onChange={(event) => setGuestPhonePrefix(event.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="guestPhone">Phone number</Label>
                                                <Input id="guestPhone" value={guestPhone} placeholder="70000000" onChange={(event) => setGuestPhone(event.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="guestEmail">Email</Label>
                                            <Input id="guestEmail" type="email" value={guestEmail} placeholder="you@example.com" onChange={(event) => setGuestEmail(event.target.value)} />
                                        </div>
                                        {fulfillmentType === "DELIVERY" ? (
                                            <>
                                                <div className="grid gap-1.5">
                                                    <Label>
                                                        Delivery address <span className="text-brand">*</span>
                                                    </Label>
                                                    <DeliveryAddressPicker
                                                        value={deliveryAddress}
                                                        onChange={(address) => setDeliveryAddress(address)}
                                                        error={fieldErrors.deliveryAddress}
                                                        onErrorClear={() => setFieldErrors((prev) => ({ ...prev, deliveryAddress: undefined }))}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="deliveryInstructions">
                                                        Delivery instructions{" "}
                                                        <span className="text-xs font-normal text-text-muted">(optional)</span>
                                                    </Label>
                                                    <textarea
                                                        id="deliveryInstructions"
                                                        value={deliveryInstructions}
                                                        placeholder="Apartment, floor, gate code…"
                                                        onChange={(event) => setDeliveryInstructions(event.target.value)}
                                                        className="min-h-[72px] rounded-md border border-surface-border bg-page px-3 py-2 text-sm text-text-main"
                                                    />
                                                </div>
                                            </>
                                        ) : null}
                                        <div className="grid gap-2">
                                            <Label htmlFor="notes">
                                                Special requests{" "}
                                                <span className="text-xs font-normal text-text-muted">(optional)</span>
                                            </Label>
                                            <textarea
                                                id="notes"
                                                value={notes}
                                                placeholder="Allergies, preferences, anything we should know…"
                                                onChange={(event) => setNotes(event.target.value)}
                                                className="min-h-[72px] rounded-md border border-surface-border bg-page px-3 py-2 text-sm text-text-main"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Step 4: Review & pay */}
                                {checkoutStep === 4 && (
                                    <>
                                        <div className="space-y-3 rounded-2xl border border-surface-border bg-page p-4 text-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-text-muted">Fulfillment</span>
                                                <span className="text-right font-medium text-text-main">
                                                    {fulfillmentType === "PICKUP" ? "Pick up at store" : "Delivery"}
                                                    {selectedPoint ? ` · ${selectedPoint.name}` : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-text-muted">When</span>
                                                <span className="text-right font-medium text-text-main">
                                                    {orderType === "ASAP"
                                                        ? "As soon as possible"
                                                        : `${scheduledDate}${scheduledTimeframe ? ` · ${scheduledTimeframe}` : ""}`}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-text-muted">Contact</span>
                                                <span className="text-right font-medium text-text-main">{guestName || "—"}</span>
                                            </div>
                                            {fulfillmentType === "DELIVERY" && deliveryAddress ? (
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="shrink-0 text-text-muted">Address</span>
                                                    <span className="max-w-[180px] text-right font-medium text-text-main">{deliveryAddress}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        {/* QR Payment */}
                                        <div className="rounded-2xl border border-surface-border bg-page p-4 text-sm">
                                            <p className="font-medium text-text-main">Pay with QR</p>
                                            <p className="mt-1 text-text-muted">
                                                Scan the QR below and complete your payment. Then upload your comprobante to confirm the order.
                                            </p>
                                            {commerce.settings.qr_image_url ? (
                                                <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-2xl border border-surface-border bg-white">
                                                    <Image
                                                        src={getImageUrl(commerce.settings.qr_image_url) || commerce.settings.qr_image_url}
                                                        alt="Payment QR code"
                                                        fill
                                                        sizes="320px"
                                                        className="object-contain p-4"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Comprobante upload */}
                                        <div className="rounded-2xl border border-surface-border bg-page p-4 text-sm">
                                            <p className="font-medium text-text-main">Upload your payment proof</p>
                                            <p className="mt-1 text-text-muted">
                                                Take a screenshot or photo of your payment confirmation and upload it here.
                                            </p>
                                            {/* Preview */}
                                            {qrProofPreview && (
                                                <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-white">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={qrProofPreview} alt="Payment proof preview" className="h-full w-full object-contain" />
                                                    {qrProofUploading && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-text-muted">
                                                            Uploading…
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <label className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${qrProofUrl ? "border-green-400 bg-green-50 text-green-700" : "border-surface-border text-text-muted hover:border-brand hover:text-brand"}`}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="sr-only"
                                                    onChange={(e) => void handleQrProofFileChange(e)}
                                                    disabled={qrProofUploading}
                                                />
                                                {qrProofUrl ? "✓ Proof uploaded — tap to change" : qrProofUploading ? "Uploading…" : "Choose image"}
                                            </label>
                                            {fulfillmentType === "DELIVERY" && (
                                                <p className="mt-3 rounded-xl bg-surface-border/30 px-3 py-2 text-xs text-text-muted">
                                                    El negocio se contactará contigo para confirmarte el costo del envío.
                                                </p>
                                            )}
                                        </div>

                                        {cartEntries.length === 0 ? (
                                            <p className="rounded-xl border border-surface-border bg-page px-3 py-3 text-sm text-text-muted">
                                                Your cart is empty. Go back and add at least one item before placing your order.
                                            </p>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between border-t border-surface-border pt-3 text-sm">
                                                    <span className="text-text-muted">Total</span>
                                                    <span className="text-base font-semibold text-text-main">{formatMoney(cartTotal)}</span>
                                                </div>
                                                {!qrProofUrl && (
                                                    <p className="text-center text-xs text-text-muted">
                                                        Upload your payment proof above to place the order.
                                                    </p>
                                                )}
                                                <Button
                                                    className="w-full bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                                                    disabled={submitting || !qrProofUrl}
                                                    onClick={() => void handleSubmitOrder()}
                                                >
                                                    {submitting ? "Placing your order…" : `Place order · ${formatMoney(cartTotal)}`}
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Navigation */}
                                <div className="flex items-center gap-3 pt-1">
                                    {checkoutStep > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => { setCheckoutStep((s) => s - 1); setFieldErrors({}); }}
                                            className="text-sm text-text-muted transition hover:text-text-main"
                                        >
                                            ← Back
                                        </button>
                                    )}
                                    <div className="flex-1" />
                                    {checkoutStep < 4 && (
                                        <Button
                                            type="button"
                                            className="bg-brand text-white hover:bg-brand-hover"
                                            disabled={checkoutStep === 1 && cartEntries.length === 0}
                                            onClick={handleAdvanceStep}
                                        >
                                            Continue
                                        </Button>
                                    )}
                                </div>

                            </CardContent>
                        </Card>

                        {createdOrder ? (
                            <Card className="border-surface-border bg-surface">
                                <CardHeader>
                                    <CardTitle>Order created</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-text-muted">
                                    <p className="text-text-main">Order #{createdOrder.id}</p>
                                    <p>Total: {formatMoney(createdOrder.total_cents)}</p>
                                    <p>Payment status: {createdOrder.payment_status}</p>
                                </CardContent>
                            </Card>
                        ) : null}

                        {selectedPoint ? (
                            <Card className="border-surface-border bg-surface">
                                <CardHeader>
                                    <CardTitle>Selected point of sale</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-text-muted">
                                    <p className="font-medium text-text-main">{selectedPoint.name}</p>
                                    <p>{selectedPoint.city}</p>
                                    {selectedPoint.opening_hours_text ? <p>{selectedPoint.opening_hours_text}</p> : null}
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* Previous orders for logged-in users */}
                        {user ? (
                            <Card className="border-surface-border bg-surface">
                                <CardHeader>
                                    <CardTitle className="text-base">Your orders</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {ordersLoading ? (
                                        <p className="text-sm text-text-muted">Loading…</p>
                                    ) : myOrders.length === 0 ? (
                                        <p className="text-sm text-text-muted">You haven't placed any orders yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {myOrders.map((order) => (
                                                <div key={order.id} className="rounded-xl border border-surface-border bg-page p-3 text-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-text-main">Order #{order.id}</p>
                                                            <p className="mt-0.5 text-xs text-text-muted">
                                                                {new Date(order.created_at).toLocaleDateString(undefined, {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                })}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-text-main">
                                                                {formatFixedCurrencyFromCents(order.total_cents, order.company.currency)}
                                                            </p>
                                                            <p className={`mt-0.5 text-xs capitalize ${order.payment_status === "CONFIRMED" ? "text-green-600" : "text-amber-600"}`}>
                                                                {order.payment_status === "CONFIRMED" ? "Paid" : "Pending payment"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {order.items.length > 0 && (
                                                        <p className="mt-2 text-xs text-text-muted">
                                                            {order.items.map((item) => `${item.quantity}× ${item.product_name}`).join(", ")}
                                                        </p>
                                                    )}
                                                    <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${order.status === "DELIVERED" || order.status === "COMPLETED" ? "bg-green-100 text-green-700" : order.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                                        {order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_/g, " ")}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}
                    </aside>
                </div>
            </main>

            <Dialog open={Boolean(activeProduct)} onOpenChange={(open) => !open && setProductDialogId(null)}>
                <DialogContent className="max-w-2xl">
                    {activeProduct ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{activeProduct.name}</DialogTitle>
                                <DialogDescription>
                                    {formatMoney(
                                        activeProduct.effective_price_cents ?? activeProduct.promotional_price_cents ?? activeProduct.regular_price_cents,
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                                <div className="relative aspect-square overflow-hidden rounded-2xl border border-surface-border bg-page">
                                    {activeProduct.images[0] ? (
                                        <Image
                                            src={getImageUrl(activeProduct.images[0]) || activeProduct.images[0]}
                                            alt={activeProduct.name}
                                            fill
                                            sizes="420px"
                                            className="object-cover"
                                        />
                                    ) : null}
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm leading-7 text-text-muted">
                                        {activeProduct.description || "No description available for this product yet."}
                                    </p>
                                    <div className="rounded-2xl border border-surface-border bg-page p-4 text-sm text-text-muted">
                                        <p>Stock available: {activeProduct.stock_quantity}</p>
                                        {activeProduct.is_combo ? <p className="mt-2">This product is marked as a combo.</p> : null}
                                    </div>
                                    <Button
                                        className="bg-brand text-white hover:bg-brand-hover"
                                        disabled={(cart.find((item) => item.productId === activeProduct.id)?.quantity || 0) >= activeProduct.stock_quantity}
                                        onClick={() => {
                                            updateCart(
                                                activeProduct.id,
                                                (cart.find((item) => item.productId === activeProduct.id)?.quantity || 0) + 1,
                                            );
                                            setProductDialogId(null);
                                        }}
                                    >
                                        {(cart.find((item) => item.productId === activeProduct.id)?.quantity || 0) >= activeProduct.stock_quantity
                                            ? "Out of stock"
                                            : "Add to cart"}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}
