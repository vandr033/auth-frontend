"use client";

import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { SocialIcons } from "./SocialIcons";
import { useShop } from "@/app/shop/contexts/ShopContext";
import { useT } from "@/lib/i18n";

const PRICONPRI_DEMO_HREF = "https://cal.com/priconpri/demo";

export function ShopFooter() {
    const { company, socialLinks, slug } = useShop();
    const t = useT();

    if (!company) return null;

    const navLinks = [
        { label: t('shopNav.home'), href: `/shop/${slug}` },
        { label: t('shopNav.services'), href: `/shop/${slug}/services` },
        { label: t('shopNav.about'), href: `/shop/${slug}/about` },
        { label: t('common.bookNow'), href: `/shop/${slug}/book` },
    ];

    return (
        <footer className="border-t border-surface-border bg-section">
            <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
                <div className="grid gap-8 md:grid-cols-3">
                    {/* Brand + Contact */}
                    <div className="space-y-4">
                        <h3 className="font-heading text-xl font-bold text-text-main">
                            {company.name}
                        </h3>
                        <div className="space-y-2 text-sm text-text-muted">
                            {company.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{company.address}{company.city ? `, ${company.city}` : ""}</span>
                                </div>
                            )}
                            {company.phone && (
                                <a
                                    href={`tel:+${company.phone_prefix}${company.phone}`}
                                    className="flex items-center gap-2 transition-colors hover:text-brand"
                                >
                                    <Phone className="h-4 w-4 shrink-0" />
                                    <span>+{company.phone_prefix} {company.phone}</span>
                                </a>
                            )}
                            {company.email && (
                                <a
                                    href={`mailto:${company.email}`}
                                    className="flex items-center gap-2 transition-colors hover:text-brand"
                                >
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span>{company.email}</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                            {t('shopFooter.navigation')}
                        </h4>
                        <nav className="flex flex-col gap-2">
                            {navLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm text-text-main transition-colors hover:text-brand"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Social */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                            {t('shopFooter.followUs')}
                        </h4>
                        <SocialIcons socialLinks={socialLinks} iconSize={22} />
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 border-t border-surface-border pt-6">
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-text-muted">
                        <p>{t('common.poweredBy')}</p>
                        <a
                            href={PRICONPRI_DEMO_HREF}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-sm border border-surface-border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.04em] text-brand transition-colors hover:bg-brand-soft-bg"
                        >
                            {t("shopFooter.poweredByCta")}
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
