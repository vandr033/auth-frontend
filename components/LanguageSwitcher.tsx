"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useI18n, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
    variant?: "shop" | "admin";
    showLabel?: boolean;
}

export function LanguageSwitcher({ variant = "shop", showLabel = true }: LanguageSwitcherProps) {
    const { locale, setLocale, t } = useI18n();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isShop = variant === "shop";

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={t("language.label")}
                className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition",
                    isShop
                        ? "text-text-muted hover:text-text-main hover:bg-surface-border/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                )}
                title={t("language.label")}
            >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">{locale}</span>
                {showLabel ? <span className="hidden sm:inline">{t(`language.${locale}`)}</span> : null}
            </button>

            {open && (
                <div
                    className={cn(
                        "absolute right-0 mt-1 w-36 rounded-md border shadow-lg overflow-hidden z-50",
                        isShop
                            ? "bg-surface border-surface-border"
                            : "bg-slate-800 border-slate-700",
                    )}
                >
                    {SUPPORTED_LOCALES.map((code) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => {
                                setLocale(code as Locale);
                                setOpen(false);
                            }}
                            className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-sm transition",
                                isShop
                                    ? locale === code
                                        ? "bg-brand-soft-bg text-brand font-medium"
                                        : "text-text-main hover:bg-page"
                                    : locale === code
                                        ? "bg-slate-700 text-white font-medium"
                                        : "text-slate-300 hover:bg-slate-700",
                            )}
                        >
                            {t(`language.${code}`)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
