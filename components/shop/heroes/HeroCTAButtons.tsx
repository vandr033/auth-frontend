"use client";

import Link from "next/link";
import type { HomeCTAButton, CTADestination, ShopPublicFeatureVisibility } from "@/types/shop";
import { isShopDestinationVisible } from "@/lib/storefront/public-features";

function getCTAHref(destination: CTADestination, slug: string): string {
    switch (destination) {
        case "booking": return `/shop/${slug}/book`;
        case "services": return `/shop/${slug}/services`;
        case "store": return `/shop/${slug}/store`;
        case "free-events": return `/shop/${slug}/events?free=true`;
        case "events": return `/shop/${slug}/events`;
        case "classes": return `/shop/${slug}/classes`;
    }
}

function hexToRgba(hex: string, opacity: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function getReadableTextColor(hex: string): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.72 ? "#111827" : "#ffffff";
}

interface HeroCTAButtonsProps {
    slug: string;
    /** Custom buttons from PRO config. When null/undefined, renders the default fallback. */
    buttons: HomeCTAButton[] | null | undefined;
    publicFeatures: ShopPublicFeatureVisibility;
    /** Used only when buttons is null — renders the hero's default hardcoded CTAs */
    defaultContent: React.ReactNode;
    /** CSS class applied to the container div */
    className?: string;
}

/**
 * Renders the hero CTA button row.
 * - When `buttons` is non-null (PRO config), renders dynamic buttons.
 * - When `buttons` is null, renders `defaultContent` (the original hardcoded CTAs).
 */
export function HeroCTAButtons({
    slug,
    buttons,
    publicFeatures,
    defaultContent,
    className,
}: HeroCTAButtonsProps) {
    if (!buttons || buttons.length === 0) {
        return <>{defaultContent}</>;
    }

    const sorted = [...buttons]
        .filter((b) => b.enabled && isShopDestinationVisible(b.destination, publicFeatures))
        .sort((a, b) => a.order - b.order);

    if (sorted.length === 0) {
        return <>{defaultContent}</>;
    }

    return (
        <div className={className}>
            {sorted.map((btn, idx) => {
                const href = getCTAHref(btn.destination, slug);
                if (!href) return null;
                const isPrimary = idx === 0;

                const sharedClass =
                    "inline-flex h-11 min-w-[140px] items-center justify-center rounded-md px-6 text-base font-semibold transition focus-visible:outline-none";

                if (isPrimary) {
                    const bg = hexToRgba(btn.color, btn.opacity);
                    return (
                        <Link
                            key={btn.destination}
                            href={href}
                            style={{ backgroundColor: bg, color: getReadableTextColor(btn.color) }}
                            className={`${sharedClass} shadow-card hover:opacity-90`}
                        >
                            {btn.label}
                        </Link>
                    );
                }

                const ghostColor = hexToRgba(btn.color, btn.opacity);
                    return (
                        <Link
                            key={btn.destination}
                            href={href}
                        style={{
                            borderColor: ghostColor,
                            color: ghostColor,
                            backgroundColor: "transparent",
                        }}
                        className={`${sharedClass} border backdrop-blur-sm hover:opacity-80`}
                    >
                        {btn.label}
                    </Link>
                );
            })}
        </div>
    );
}
