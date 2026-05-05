"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgePercent, Box, ChevronLeft, ShoppingCart, ZoomIn, X, ChevronRight, ChevronLeft as ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";
import { notify } from "@/lib/notify";
import { getPublicCommerceProduct } from "@/app/shop/lib/commerceApi";
import { useCommerceCart } from "@/app/shop/lib/useCommerceCart";
import { useT } from "@/lib/i18n";
import { useShop } from "../../../contexts/ShopContext";
import type { ShopCommerceComboItem, ShopCommerceProduct, ShopCommerceProductImage } from "@/types/shop";
import { getImageUrl } from "@/utils/image-url";

// ─── Zoom overlay ──────────────────────────────────────────────────────────
function ZoomOverlay({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    const [pos, setPos] = React.useState({ x: 50, y: 50 });
    const [zoomed, setZoomed] = React.useState(false);
    const imgRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleMove = React.useCallback((clientX: number, clientY: number) => {
        const rect = imgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        setPos({ x, y });
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                onClick={onClose}
            >
                <X className="h-5 w-5" />
            </button>
            <div
                ref={imgRef}
                className="relative max-h-[90vh] max-w-[90vw] cursor-zoom-in overflow-hidden rounded-2xl"
                style={{ cursor: zoomed ? "zoom-out" : "zoom-in" }}
                onClick={(e) => { e.stopPropagation(); setZoomed((v) => !v); }}
                onMouseMove={(e) => zoomed && handleMove(e.clientX, e.clientY)}
                onTouchMove={(e) => zoomed && handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            >
                <img
                    src={src}
                    alt={alt}
                    className="block max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200"
                    style={
                        zoomed
                            ? {
                                transform: "scale(2.5)",
                                transformOrigin: `${pos.x}% ${pos.y}%`,
                            }
                            : { transform: "scale(1)" }
                    }
                />
                {!zoomed && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                        <ZoomIn className="h-3.5 w-3.5" />
                        Clic para acercar
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Cart preview slide-in ─────────────────────────────────────────────────
function CartPreviewPanel({
    open,
    onClose,
    slug,
    currency,
}: {
    open: boolean;
    onClose: () => void;
    slug: string;
    currency?: string | null;
}) {
    const { items, subtotal, totalItems } = useCommerceCart(slug);
    const t = useT();

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-brand" />
                        <p className="font-semibold text-text-main">
                            {t("shopStore.cartButton", { count: totalItems })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-text-muted transition hover:bg-page"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {items.length === 0 ? (
                        <p className="py-8 text-center text-sm text-text-muted">{t("shopStore.emptyCartTitle")}</p>
                    ) : (
                        <ul className="space-y-3">
                            {items.map((item) => (
                                <li key={item.productId} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-page p-3">
                                    {item.imageUrl ? (
                                        <img
                                            src={getImageUrl(item.imageUrl) ?? item.imageUrl}
                                            alt={item.name}
                                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft-bg">
                                            <Box className="h-6 w-6 text-brand" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-text-main">{item.name}</p>
                                        <p className="text-xs text-text-muted">
                                            {item.quantity} × {formatCurrencyAmount(item.unitPrice, currency)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold text-text-main">
                                        {formatCurrencyAmount(item.unitPrice * item.quantity, currency)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="border-t border-surface-border px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-text-muted">{t("shopStore.subtotal")}</p>
                            <p className="text-xl font-bold text-text-main">{formatCurrencyAmount(subtotal, currency)}</p>
                        </div>
                        <Link href={`/shop/${slug}/store/cart`} className="block">
                            <Button className="w-full bg-brand text-white hover:bg-brand-hover">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                {t("shopStore.cartButton", { count: totalItems })}
                            </Button>
                        </Link>
                        <button onClick={onClose} className="w-full text-center text-sm text-text-muted underline">
                            {t("shopStore.backToStore")}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function StoreProductDetailPage() {
    const t = useT();
    const params = useParams<{ productSlug: string }>();
    const productSlug = params?.productSlug ?? "";
    const { company, slug, commerceProducts } = useShop();
    const { items, addProduct, updateQuantity, totalItems } = useCommerceCart(slug);
    const [product, setProduct] = React.useState<ShopCommerceProduct | null>(
        commerceProducts.find((item) => item.slug === productSlug) ?? null,
    );
    const [loading, setLoading] = React.useState(!product);
    const [quantity, setQuantity] = React.useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
    const [zoomOpen, setZoomOpen] = React.useState(false);
    const [cartPreviewOpen, setCartPreviewOpen] = React.useState(false);

    // Get current item from cart if exists
    const cartItem = items.find((i) => i.productId === product?.id);
    const currentQuantity = cartItem ? cartItem.quantity : quantity;

    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setLoading(true);
                if (!productSlug) return;
                const data = await getPublicCommerceProduct(slug, productSlug);
                if (!cancelled) setProduct(data);
            } catch (error) {
                if (!cancelled) {
                    notify.error(error instanceof Error ? error.message : t("shopStore.productNotFound"));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void run();
        return () => { cancelled = true; };
    }, [productSlug, slug, t]);

    if (loading && !product) {
        return <main className="flex min-h-screen items-center justify-center bg-page text-text-main">{t("shopStore.loadingProduct")}</main>;
    }

    if (!product || !company) {
        return <main className="flex min-h-screen items-center justify-center bg-page text-text-main">{t("shopStore.productNotFound")}</main>;
    }

    const finalPrice = product.pricing?.final_price ?? product.price;
    const comparisonPrice = product.pricing?.promo_applied
        ? product.pricing?.regular_price ?? product.pricing?.base_price ?? product.price
        : product.pricing?.regular_price ?? product.regular_price ?? null;

    const ownImages: ShopCommerceProductImage[] = product.images?.length ? product.images : [];
    const comboComponentImages: ShopCommerceProductImage[] = [];
    if (product.product_type === "COMBO" && product.combo_items?.length) {
        product.combo_items.forEach((item) => {
            const contextProduct = commerceProducts.find((p) => p.id === item.component_product?.id);
            if (contextProduct?.images?.length) {
                comboComponentImages.push(...contextProduct.images);
            }
        });
    }

    // Deduplicate by image.id if needed, but simple combination is:
    const allImages = [...ownImages, ...comboComponentImages];
    const uniqueImages = Array.from(new Map(allImages.map((img) => [img.id, img])).values());
    const images: ShopCommerceProductImage[] = uniqueImages;

    // Sort: primary first
    const sortedImages = [...images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return a.sort_order - b.sort_order;
    });

    const safeIndex = Math.min(selectedImageIndex, Math.max(0, sortedImages.length - 1));
    const activeImage = sortedImages[safeIndex];
    const activeImageUrl = getImageUrl(activeImage?.image_url);

    const goNext = () => setSelectedImageIndex((i) => (i + 1) % sortedImages.length);
    const goPrev = () => setSelectedImageIndex((i) => (i - 1 + sortedImages.length) % sortedImages.length);

    const handleAddToCart = () => {
        addProduct(product, quantity);
        setCartPreviewOpen(true);
    };

    return (
        <main className="min-h-screen bg-page text-text-main">
            {/* Top bar */}
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
                <div className="mb-6 flex items-center justify-between">
                    <Link href={`/shop/${slug}/store`} className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main">
                        <ChevronLeft className="h-4 w-4" />
                        {t("shopStore.backToStore")}
                    </Link>
                    <button
                        onClick={() => setCartPreviewOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-main shadow-sm transition hover:bg-page"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {t("shopStore.cartButton", { count: totalItems })}
                    </button>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* ── Image gallery ─────────────────── */}
                    <div className="space-y-3">
                        {/* Main image with zoom hint */}
                        <div className="group relative overflow-hidden rounded-3xl border border-surface-border bg-surface">
                            {activeImageUrl ? (
                                <>
                                    <img
                                        src={activeImageUrl}
                                        alt={activeImage?.alt_text || product.name}
                                        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    />
                                    {/* Zoom button */}
                                    <button
                                        onClick={() => setZoomOpen(true)}
                                        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
                                    >
                                        <ZoomIn className="h-3.5 w-3.5" />
                                        Ampliar
                                    </button>
                                    {/* Arrow nav (only when multiple images) */}
                                    {sortedImages.length > 1 && (
                                        <>
                                            <button
                                                onClick={goPrev}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
                                            >
                                                <ChevronLeftIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={goNext}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                    {/* Dot indicators */}
                                    {sortedImages.length > 1 && (
                                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                                            {sortedImages.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedImageIndex(i)}
                                                    className={`h-1.5 rounded-full transition-all ${i === safeIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft-bg text-brand">
                                    <Box className="h-12 w-12" />
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {sortedImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {sortedImages.map((image, i) => {
                                    const thumbUrl = getImageUrl(image.image_url);
                                    return (
                                        <button
                                            key={image.id}
                                            onClick={() => setSelectedImageIndex(i)}
                                            className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                                                i === safeIndex
                                                    ? "border-brand shadow-[0_0_0_2px_rgba(var(--color-brand-rgb),0.15)]"
                                                    : "border-surface-border hover:border-brand/50"
                                            }`}
                                            style={{ width: 72, height: 72 }}
                                        >
                                            {thumbUrl ? (
                                                <img
                                                    src={thumbUrl}
                                                    alt={image.alt_text || product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-brand-soft-bg">
                                                    <Box className="h-5 w-5 text-brand" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Product info ──────────────────── */}
                    <div className="rounded-3xl border border-surface-border bg-surface p-6 shadow-card">
                        <div className="flex flex-wrap gap-2">
                            {product.pricing?.promo_applied ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft-bg px-3 py-1 text-xs font-semibold text-brand">
                                    <BadgePercent className="h-3.5 w-3.5" />
                                    {product.promo_label || t("shopStore.promoBadge")}
                                </span>
                            ) : null}
                            {product.product_type === "COMBO" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                    <Box className="h-3.5 w-3.5" />
                                    {t("shopStore.comboBadge")}
                                </span>
                            ) : null}
                        </div>

                        <h1 className="mt-4 font-heading text-4xl font-semibold">{product.name}</h1>
                        {product.description ? (
                            <p className="mt-4 whitespace-pre-line text-base leading-7 text-text-muted">
                                {product.description}
                            </p>
                        ) : null}

                        <div className="mt-6">
                            {comparisonPrice != null && comparisonPrice > finalPrice ? (
                                <p className="text-base text-text-muted line-through">
                                    {formatCurrencyAmount(comparisonPrice, company.currency)}
                                </p>
                            ) : null}
                            <p className="text-3xl font-bold">
                                {formatCurrencyAmount(finalPrice, company.currency)}
                            </p>
                        </div>

                        {product.combo_items?.length ? (
                            <div className="mt-6 rounded-2xl bg-page p-4">
                                <p className="text-sm font-semibold text-text-main">{t("shopStore.includes")}</p>
                                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                                    {product.combo_items.map((item: ShopCommerceComboItem) => (
                                        <li key={item.id} className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft-bg text-[10px] font-bold text-brand">
                                                {item.quantity}
                                            </span>
                                            {item.component_product?.name ?? t("shopStore.genericProduct")}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        <div className="mt-8 space-y-3">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-text-muted">{t("shopStore.quantity") ?? "Cantidad"}</label>
                                <div className="flex items-center rounded-xl border border-surface-border bg-page">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (cartItem) {
                                                updateQuantity(product.id, cartItem.quantity - 1);
                                            } else {
                                                setQuantity((q) => Math.max(1, q - 1));
                                            }
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-l-xl text-text-muted transition hover:bg-surface hover:text-text-main"
                                    >
                                        −
                                    </button>
                                    <span className="w-10 text-center text-sm font-semibold text-text-main">{currentQuantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (cartItem) {
                                                updateQuantity(product.id, cartItem.quantity + 1);
                                            } else {
                                                setQuantity((q) => q + 1);
                                            }
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-r-xl text-text-muted transition hover:bg-surface hover:text-text-main"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {!cartItem ? (
                                <Button
                                    className="w-full bg-brand text-white hover:bg-brand-hover"
                                    onClick={handleAddToCart}
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    {t("shopStore.addToCart")}
                                </Button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 rounded-xl bg-brand-soft-bg py-2 text-sm font-medium text-brand">
                                        <ShoppingCart className="h-4 w-4" />
                                        {t("shopStore.alreadyInCart")}
                                    </div>
                                    <Link href={`/shop/${slug}/store/cart`} className="block">
                                        <Button className="w-full bg-brand text-white hover:bg-brand-hover">
                                            {t("shopStore.goToCart")}
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {!cartItem && (
                                <Link href={`/shop/${slug}/store/cart`} className="block">
                                    <Button variant="outline" className="w-full">
                                        {t("shopStore.cartButton", { count: totalItems })}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom overlay */}
            {zoomOpen && activeImageUrl && (
                <ZoomOverlay
                    src={activeImageUrl}
                    alt={activeImage?.alt_text || product.name}
                    onClose={() => setZoomOpen(false)}
                />
            )}

            {/* Cart preview panel */}
            <CartPreviewPanel
                open={cartPreviewOpen}
                onClose={() => setCartPreviewOpen(false)}
                slug={slug}
                currency={company.currency}
            />
        </main>
    );
}
