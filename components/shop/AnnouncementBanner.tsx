"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { AnnouncementBanner } from "@/types/shop";

function getActiveBanner(banners: AnnouncementBanner[]): AnnouncementBanner | null {
    const now = new Date();
    return (
        banners
            .filter((b) => {
                if (!b.enabled) return false;
                if (b.expires_at && new Date(b.expires_at) < now) return false;
                return true;
            })
            // Show the one expiring soonest first (most urgent)
            .sort((a, b) => {
                if (!a.expires_at) return 1;
                if (!b.expires_at) return -1;
                return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
            })[0] ?? null
    );
}

function getDismissalKey(banner: AnnouncementBanner): string {
    return `banner_dismissed_${banner.id}`;
}

interface AnnouncementBannerStripProps {
    banners: AnnouncementBanner[] | null | undefined;
}

export function AnnouncementBannerStrip({ banners }: AnnouncementBannerStripProps) {
    const [dismissed, setDismissed] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch — localStorage only available client-side
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const active = React.useMemo(
        () => (banners && banners.length > 0 ? getActiveBanner(banners) : null),
        [banners],
    );

    const isDismissed = React.useMemo(() => {
        if (!mounted || !active) return false;
        try {
            return localStorage.getItem(getDismissalKey(active)) === "1";
        } catch {
            return false;
        }
    }, [active, mounted]);

    const handleDismiss = () => {
        if (!active) return;
        try {
            localStorage.setItem(getDismissalKey(active), "1");
        } catch {
            // ignore
        }
        setDismissed(true);
    };

    if (!active || !mounted || isDismissed || dismissed) return null;

    const { message, link_url, link_label, background_color, text_color } = active;

    return (
        <div
            className="relative z-50 flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium"
            style={{ backgroundColor: background_color, color: text_color }}
        >
            <span className="flex-1 text-center">
                {message}
                {link_url && (
                    <Link
                        href={link_url}
                        className="ml-2 underline underline-offset-2 hover:opacity-80"
                        target={link_url.startsWith("http") ? "_blank" : undefined}
                        rel={link_url.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                        {link_label || "Ver más"}
                    </Link>
                )}
            </span>
            <button
                onClick={handleDismiss}
                aria-label="Cerrar anuncio"
                className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
