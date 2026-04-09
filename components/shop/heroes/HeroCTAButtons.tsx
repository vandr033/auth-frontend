"use client";

import Link from "next/link";
import { PrimaryButton } from "@/app/components/PrimaryButton";
import { Button } from "@/components/ui/button";
import type { HomeCTAButton, CTADestination } from "@/types/shop";

function getCTAHref(destination: CTADestination, slug: string): string {
    switch (destination) {
        case "booking": return `/shop/${slug}/book`;
        case "services": return `/shop/${slug}/services`;
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

interface HeroCTAButtonsProps {
    slug: string;
    /** Custom buttons from PRO config. When null/undefined, renders the default fallback. */
    buttons: HomeCTAButton[] | null | undefined;
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
    defaultContent,
    className,
}: HeroCTAButtonsProps) {
    if (!buttons || buttons.length === 0) {
        return <>{defaultContent}</>;
    }

    const sorted = [...buttons]
        .filter((b) => b.enabled)
        .sort((a, b) => a.order - b.order);

    if (sorted.length === 0) {
        return <>{defaultContent}</>;
    }

    return (
        <div className={className}>
            {sorted.map((btn, idx) => {
                const href = getCTAHref(btn.destination, slug);
                const isPrimary = idx === 0;

                if (isPrimary) {
                    return (
                        <Link key={btn.destination} href={href}>
                            <PrimaryButton
                                style={{ backgroundColor: hexToRgba(btn.color, btn.opacity) }}
                            >
                                {btn.label}
                            </PrimaryButton>
                        </Link>
                    );
                }

                const ghostColor = hexToRgba(btn.color, btn.opacity);
                return (
                    <Link key={btn.destination} href={href}>
                        <Button
                            style={{
                                borderColor: ghostColor,
                                color: ghostColor,
                                backgroundColor: "transparent",
                            }}
                            className="border font-semibold backdrop-blur-sm transition hover:opacity-80"
                        >
                            {btn.label}
                        </Button>
                    </Link>
                );
            })}
        </div>
    );
}
