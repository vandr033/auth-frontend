"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Menu, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import { useShop } from "../contexts/ShopContext";
import { getImageUrl } from "@/utils/image-url";
import { SocialIcons } from "@/components/shop/SocialIcons";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
    appendShopParam,
    buildSignInRedirectFromCurrentLocation,
    getCurrentInternalPathWithQuery,
} from "@/app/lib/shop-context";
import { AnnouncementBannerStrip } from "@/components/shop/AnnouncementBanner";

const getDisplayName = (user?: {
    name?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
} | null) => {
    const firstName = user?.first_name?.trim() || "";
    const lastName = user?.last_name?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
    if (user?.name?.trim()) return user.name.trim();
    if (user?.email?.trim()) return user.email.trim();
    return "User";
};

const getInitials = (user?: {
    name?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
} | null) => {
    const firstInitial = user?.first_name?.trim()?.charAt(0) || user?.name?.trim()?.charAt(0) || user?.email?.trim()?.charAt(0) || "U";
    const lastInitial = user?.last_name?.trim()?.charAt(0) || "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
};

export function ShopNavbar() {
    const pathname = usePathname();
    const currentPathname = pathname ?? "";
    const router = useRouter();
    const { isAuthenticated, user, signOut, loading } = useAuth();
    const { company, slug, socialLinks, loading: shopLoading, announcementBanners, publicFeatures, canBookOnline } = useShop();
    const t = useT();

    const [open, setOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const resolvedShopSlug = company?.slug || slug;
    const basePath = `/shop/${resolvedShopSlug}`;
    const profileHref = appendShopParam("/me/profile", resolvedShopSlug);
    const appointmentsHref = appendShopParam("/me/appointments", resolvedShopSlug);
    const reviewsHref = appendShopParam("/me/reviews", resolvedShopSlug);
    const groupReservationsHref = appendShopParam("/me/group-reservations", resolvedShopSlug);
    const ordersHref = resolvedShopSlug ? `/shop/${resolvedShopSlug}/me/orders` : "/me/orders";
    const userDisplayName = getDisplayName(user);
    const showGroupReservationsLink = publicFeatures.eventsVisible || publicFeatures.classesVisible;

    const navLinks = [
        { href: basePath, label: t('shopNav.home') },
        ...(publicFeatures.servicesVisible ? [{ href: `${basePath}/services`, label: t('shopNav.services') }] : []),
        ...(publicFeatures.commerceVisible ? [{ href: `${basePath}/store`, label: t('shopNav.store') }] : []),
        ...(publicFeatures.eventsVisible ? [{ href: `${basePath}/events`, label: t('shopNav.events') }] : []),
        ...(publicFeatures.classesVisible ? [{ href: `${basePath}/classes`, label: t('shopNav.classes') }] : []),
        { href: `${basePath}/about`, label: t('shopNav.about') },
    ];

    const isActive = (href: string) => {
        // Exact match for home, startsWith for others
        if (href === basePath) {
            return currentPathname === basePath;
        }
        return currentPathname.startsWith(href);
    };

    const linkClasses = (href: string) =>
        cn(
            "relative text-sm font-semibold text-text-muted transition hover:text-text-main",
            isActive(href) &&
            "text-brand after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-brand after:content-['']",
        );
    const stickyTopStyle = { top: "var(--shop-announcement-offset, 0px)" } as CSSProperties;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setUserMenuOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        try {
            const redirectTarget = getCurrentInternalPathWithQuery(basePath);
            await signOut();
            setUserMenuOpen(false);
            router.replace(redirectTarget);
            router.refresh();
        } catch (error) {
            console.error("Sign out failed", error);
        }
    };

    const AuthActions = () => {
        if (loading) {
            return (
                <div className="h-10 w-10 animate-pulse rounded-full bg-surface-border/60" />
            );
        }

        if (!isAuthenticated) {
            return (
                <Button
                    onClick={() => router.push(buildSignInRedirectFromCurrentLocation(basePath))}
                    variant="outline"
                    className="rounded-md border-surface-border px-4 py-2 text-sm font-semibold text-text-main transition hover:border-brand hover:text-brand"
                >
                    {t('shopNav.login')}
                </Button>
            );
        }

        return (
            <div ref={menuRef} className="relative">
                <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-border bg-surface shadow-sm transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                >
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.image ?? undefined} alt={userDisplayName} />
                        <AvatarFallback className="bg-brand text-white font-semibold text-sm">
                            {getInitials(user)}
                        </AvatarFallback>
                    </Avatar>
                </button>
                {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-lg border border-surface-border bg-surface shadow-card overflow-hidden z-50">
                        {/* User Info Header */}
                        <div className="flex items-center gap-3 border-b border-surface-border bg-section px-4 py-3">
                            <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={user?.image ?? undefined} alt={userDisplayName} />
                                <AvatarFallback className="bg-brand text-white font-semibold">
                                    {getInitials(user)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-text-main truncate">
                                    {userDisplayName}
                                </p>
                                {user?.email && (
                                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                                )}
                            </div>
                        </div>
                        <Link
                            href={profileHref}
                            className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
                        >
                            {t('shopNav.myProfile')}
                        </Link>
                        <Link
                            href={appointmentsHref}
                            className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
                        >
                            {t('shopNav.myAppointments')}
                        </Link>
                        <Link
                            href={reviewsHref}
                            className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
                        >
                            {t('shopNav.myReviews')}
                        </Link>
                        {showGroupReservationsLink ? (
                            <Link
                                href={groupReservationsHref}
                                className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
                            >
                                {t('shopNav.myGroupReservations')}
                            </Link>
                        ) : null}
                        {publicFeatures.commerceVisible ? (
                            <Link
                                href={ordersHref}
                                className="block px-4 py-3 text-sm font-medium text-text-main transition hover:bg-page"
                            >
                                {t('shopNav.myOrders')}
                            </Link>
                        ) : null}
                        <Separator className="border-surface-border" />
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-brand transition hover:bg-brand-soft-bg hover:text-brand"
                        >
                            {t('shopNav.signOut')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Show skeleton while loading
    if (shopLoading) {
        return (
            <header
                className="sticky z-50 w-full border-b border-surface-border bg-surface/95 shadow-sm backdrop-blur"
                style={stickyTopStyle}
            >
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                    <div className="h-8 w-40 animate-pulse rounded bg-surface-border/60" />
                    <div className="hidden md:flex gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-4 w-16 animate-pulse rounded bg-surface-border/60" />
                        ))}
                    </div>
                    <div className="h-10 w-28 animate-pulse rounded-md bg-surface-border/60" />
                </div>
            </header>
        );
    }

    return (
        <>
        <AnnouncementBannerStrip banners={announcementBanners} />
        <header
            className="sticky z-50 w-full border-b border-surface-border bg-surface/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/80"
            style={stickyTopStyle}
        >
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                {/* Logo & Company Name */}
                <Link href={basePath} className="flex min-w-0 max-w-[15rem] items-center gap-3 sm:max-w-[19rem]">
                    {company?.logo_url ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-border/70 bg-page shadow-sm">
                            <img
                                src={getImageUrl(company.logo_url) || undefined}
                                alt={`${company.name} logo`}
                                width={40}
                                height={40}
                                className="h-full w-full rounded-[0.7rem] object-contain p-1"
                            />
                        </div>
                    ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm shadow-sm">
                            {company?.name?.charAt(0) || "S"}
                        </div>
                    )}
                    <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold leading-tight text-text-main sm:text-base">
                            {company?.name || "Shop"}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted/80">
                            <img
                                src="/assets/priconpri/mascot.webp"
                                alt=""
                                aria-hidden="true"
                                width={14}
                                height={14}
                                className="h-3.5 w-3.5 shrink-0 object-contain opacity-85"
                            />
                            <span className="truncate">by PriConPri</span>
                        </span>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className={linkClasses(link.href)}>
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 md:flex">
                    <SocialIcons socialLinks={socialLinks} iconSize={16} className="gap-2" />
                    {canBookOnline ? (
                        <Button asChild className="rounded-md bg-brand px-6 py-2 text-white shadow-card transition hover:bg-brand-hover">
                            <Link href={`${basePath}/book`}>
                                {t('shopNav.book')}
                            </Link>
                        </Button>
                    ) : null}
                    <LanguageSwitcher variant="shop" />
                    <AuthActions />
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center gap-2 md:hidden">
                    {canBookOnline ? (
                        <Button asChild className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover">
                            <Link href={`${basePath}/book`}>
                                {t('shopNav.bookShort')}
                            </Link>
                        </Button>
                    ) : null}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 border border-surface-border text-text-main"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-80 border-l border-surface-border bg-surface"
                        >
                            <div className="flex flex-col gap-4 py-6 text-base">
                                {/* User Info */}
                                <div className="flex items-center gap-3 rounded-md border border-surface-border bg-section px-3 py-3">
                                    <Avatar className="h-10 w-10 shrink-0">
                                        <AvatarImage src={user?.image ?? undefined} alt={userDisplayName} />
                                        <AvatarFallback className="bg-brand text-white font-semibold">
                                            {getInitials(user)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-text-main truncate">
                                            {isAuthenticated ? userDisplayName : t('shopNav.guest')}
                                        </p>
                                        <p className="text-sm text-text-muted truncate">
                                            {isAuthenticated ? (user?.email || t('shopNav.signedIn')) : t('shopNav.notSignedIn')}
                                        </p>
                                    </div>
                                </div>

                                {/* Nav Links */}
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "text-text-muted transition hover:text-text-main",
                                            isActive(link.href) && "text-brand",
                                        )}
                                    >
                                        {link.label}
                                    </Link>
                                ))}

                                <Separator className="border-surface-border" />

                                {/* Book Now */}
                                {canBookOnline ? (
                                    <Button asChild className="w-full rounded-md bg-brand px-4 py-2 text-white shadow-card hover:bg-brand-hover">
                                        <Link href={`${basePath}/book`} onClick={() => setOpen(false)}>
                                            {t('shopNav.book')}
                                        </Link>
                                    </Button>
                                ) : null}

                                {/* Social Links */}
                                <SocialIcons socialLinks={socialLinks} iconSize={18} className="justify-center gap-4" />

                                <LanguageSwitcher variant="shop" />

                                <Separator className="border-surface-border" />

                                {/* Auth Actions */}
                                {!isAuthenticated ? (
                                    <Button
                                        variant="outline"
                                        className="w-full border-surface-border text-text-main"
                                        onClick={() => {
                                            setOpen(false);
                                            router.push(buildSignInRedirectFromCurrentLocation(basePath));
                                        }}
                                    >
                                        {t('shopNav.signInOrCreate')}
                                    </Button>
                                ) : (
                                    <>
                                        <Link href={profileHref} onClick={() => setOpen(false)}>
                                            <Button variant="outline" className="w-full justify-start gap-2">
                                                <UserRound className="h-4 w-4" />
                                                {t('shopNav.myProfile')}
                                            </Button>
                                        </Link>
                                        <Link href={appointmentsHref} onClick={() => setOpen(false)}>
                                            <Button variant="outline" className="w-full justify-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-brand" />
                                                {t('shopNav.myAppointments')}
                                            </Button>
                                        </Link>
                                        <Link href={reviewsHref} onClick={() => setOpen(false)}>
                                            <Button variant="outline" className="w-full justify-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-brand" />
                                                {t('shopNav.myReviews')}
                                            </Button>
                                        </Link>
                                        {showGroupReservationsLink ? (
                                            <Link href={groupReservationsHref} onClick={() => setOpen(false)}>
                                                <Button variant="outline" className="w-full justify-start gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-brand" />
                                                    {t('shopNav.myGroupReservations')}
                                                </Button>
                                            </Link>
                                        ) : null}
                                        {publicFeatures.commerceVisible ? (
                                            <Link href={ordersHref} onClick={() => setOpen(false)}>
                                                <Button variant="outline" className="w-full justify-start gap-2">
                                                    <span className="h-2 w-2 rounded-full bg-brand" />
                                                    {t('shopNav.myOrders')}
                                                </Button>
                                            </Link>
                                        ) : null}
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start text-brand hover:bg-brand-soft-bg hover:text-brand"
                                            onClick={() => {
                                                setOpen(false);
                                                void handleSignOut();
                                            }}
                                        >
                                            {t('shopNav.signOut')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
        </>
    );
}
