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

function BannerMessage({
    message,
    link_url,
    link_label,
}: Pick<AnnouncementBanner, "message" | "link_url" | "link_label">) {
    return (
        <>
            <span>{message}</span>
            {link_url ? (
                <Link
                    href={link_url}
                    className="ml-2 underline underline-offset-2 hover:opacity-80"
                    target={link_url.startsWith("http") ? "_blank" : undefined}
                    rel={link_url.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                    {link_label || "Ver más"}
                </Link>
            ) : null}
        </>
    );
}

export function AnnouncementBannerStrip({ banners }: AnnouncementBannerStripProps) {
    const [dismissed, setDismissed] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [isOverflowing, setIsOverflowing] = React.useState(false);
    const [marqueeDuration, setMarqueeDuration] = React.useState(18);
    const [marqueeDistance, setMarqueeDistance] = React.useState(0);
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const viewportRef = React.useRef<HTMLDivElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);

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

    React.useEffect(() => {
        setDismissed(false);
    }, [active?.id]);

    React.useEffect(() => {
        const setOffset = (value: string) => {
            document.documentElement.style.setProperty("--shop-announcement-offset", value);
        };

        if (!active || !mounted || isDismissed || dismissed) {
            setOffset("0px");
            return;
        }

        const measure = () => {
            const root = rootRef.current;
            const viewport = viewportRef.current;
            const content = contentRef.current;

            if (active.sticky && root) {
                setOffset(`${root.offsetHeight}px`);
            } else {
                setOffset("0px");
            }

            if (!viewport || !content) {
                setIsOverflowing(false);
                return;
            }

            const contentWidth = content.scrollWidth;
            const viewportWidth = viewport.clientWidth;
            const nextOverflow = contentWidth > viewportWidth;
            setIsOverflowing(nextOverflow);
            setMarqueeDistance(contentWidth + 48);
            setMarqueeDuration(Math.max(12, Math.round((contentWidth + viewportWidth) / 80)));
        };

        measure();

        const resizeObserver =
            typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;

        if (resizeObserver) {
            if (rootRef.current) resizeObserver.observe(rootRef.current);
            if (viewportRef.current) resizeObserver.observe(viewportRef.current);
            if (contentRef.current) resizeObserver.observe(contentRef.current);
        } else {
            window.addEventListener("resize", measure);
        }

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
            setOffset("0px");
        };
    }, [active, mounted, isDismissed, dismissed]);

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
            ref={rootRef}
            className={`relative z-[60] border-b border-black/5 ${active.sticky ? "sticky top-0" : ""}`}
            style={{ backgroundColor: background_color, color: text_color }}
        >
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 text-sm font-medium">
                <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
                    {isOverflowing ? (
                        <div className="overflow-hidden">
                            <div
                                className="flex w-max items-center gap-12 whitespace-nowrap [animation:banner-marquee_var(--banner-marquee-duration)_linear_infinite] hover:[animation-play-state:paused]"
                                style={
                                    {
                                        "--banner-marquee-duration": `${marqueeDuration}s`,
                                        "--banner-marquee-distance": `-${marqueeDistance}px`,
                                    } as React.CSSProperties
                                }
                            >
                                <div ref={contentRef} className="shrink-0">
                                    <BannerMessage
                                        message={message}
                                        link_url={link_url}
                                        link_label={link_label}
                                    />
                                </div>
                                <div aria-hidden="true" className="shrink-0">
                                    <BannerMessage
                                        message={message}
                                        link_url={link_url}
                                        link_label={link_label}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div ref={contentRef} className="text-center">
                            <BannerMessage
                                message={message}
                                link_url={link_url}
                                link_label={link_label}
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={handleDismiss}
                    aria-label="Cerrar anuncio"
                    className="shrink-0 rounded p-0.5 transition-opacity hover:opacity-70"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <style jsx>{`
                @keyframes banner-marquee {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(var(--banner-marquee-distance));
                    }
                }
            `}</style>
        </div>
    );
}
