"use client";

import * as React from "react";

import type { ShopCommerceProduct } from "@/types/shop";

export type CommerceCartItem = {
    productId: string;
    productSlug: string;
    name: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
    productType: "SIMPLE" | "COMBO";
};

function getStorageKey(slug: string) {
    return `priconpri-commerce-cart:${slug}`;
}

function readCart(slug: string): CommerceCartItem[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(getStorageKey(slug));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeCart(slug: string, items: CommerceCartItem[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("commerce-cart-updated", { detail: { slug } }));
}

function resolvePrimaryImage(product: ShopCommerceProduct): string | null {
    return product.images.find((image) => image.is_primary)?.image_url ?? product.images[0]?.image_url ?? null;
}

export function useCommerceCart(slug: string) {
    const [items, setItems] = React.useState<CommerceCartItem[]>([]);

    React.useEffect(() => {
        const sync = () => setItems(readCart(slug));
        sync();
        window.addEventListener("commerce-cart-updated", sync as EventListener);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("commerce-cart-updated", sync as EventListener);
            window.removeEventListener("storage", sync);
        };
    }, [slug]);

    const updateItems = React.useCallback((nextItems: CommerceCartItem[]) => {
        setItems(nextItems);
        writeCart(slug, nextItems);
    }, [slug]);

    const addProduct = React.useCallback((product: ShopCommerceProduct, quantity = 1) => {
        const unitPrice = product.pricing?.final_price ?? product.price;
        updateItems(
            (() => {
                const current = readCart(slug);
                const existing = current.find((item) => item.productId === product.id);
                if (existing) {
                    return current.map((item) =>
                        item.productId === product.id
                            ? { ...item, quantity: item.quantity + quantity }
                            : item,
                    );
                }
                return [
                    ...current,
                    {
                        productId: product.id,
                        productSlug: product.slug,
                        name: product.name,
                        quantity,
                        unitPrice,
                        imageUrl: resolvePrimaryImage(product),
                        productType: product.product_type,
                    },
                ];
            })(),
        );
    }, [slug, updateItems]);

    const updateQuantity = React.useCallback((productId: string, quantity: number) => {
        const sanitized = Math.max(0, quantity);
        updateItems(
            readCart(slug)
                .map((item) => (item.productId === productId ? { ...item, quantity: sanitized } : item))
                .filter((item) => item.quantity > 0),
        );
    }, [slug, updateItems]);

    const removeItem = React.useCallback((productId: string) => {
        updateItems(readCart(slug).filter((item) => item.productId !== productId));
    }, [slug, updateItems]);

    const clear = React.useCallback(() => {
        updateItems([]);
    }, [updateItems]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
        items,
        totalItems,
        subtotal,
        addProduct,
        updateQuantity,
        removeItem,
        clear,
    };
}
