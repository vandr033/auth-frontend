"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
    LayoutDashboard,
    Calendar,
    Scissors,
    Users,
    UserCheck,
    UserCircle,
    CalendarClock,
    Clock,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    BellRing,
    BarChart3,
    GraduationCap,
    Sparkles,
    Store,
    Lock,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/appVersion";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { I18nProvider, useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getAdminNavigationForEntitlements,
    type AdminNavigationGroup,
    type AdminNavigationIconKey,
    type AdminNavigationItem,
} from "@/lib/admin/navigation";

const routeTitleOverrides: Array<{
    prefix: string;
    label: string;
    exact?: boolean;
}> = [
    { prefix: "/admin/dashboard/business-settings", label: "adminNav.basicSettings", exact: true },
    { prefix: "/admin/dashboard/settings", label: "adminNav.bookingSettings", exact: true },
    { prefix: "/admin/dashboard/customers/import-export", label: "adminNav.crmPro" },
    { prefix: "/admin/dashboard/customers/communications", label: "adminNav.messagingPro" },
    { prefix: "/admin/dashboard/reviews", label: "adminNav.metricsPro" },
    { prefix: "/admin/dashboard/group-reservations/events", label: "adminNav.events" },
    { prefix: "/admin/dashboard/group-reservations/classes", label: "adminNav.classes" },
    { prefix: "/admin/dashboard/group-reservations/attendance", label: "adminGroup.nav.attendance" },
    { prefix: "/admin/dashboard/group-reservations/metrics", label: "adminNav.metricsPro" },
    { prefix: "/admin/dashboard/schedule", label: "adminNav.schedule", exact: true },
    { prefix: "/admin/dashboard/time-off", label: "adminNav.timeOff", exact: true },
    { prefix: "/admin/dashboard/permissions", label: "adminNav.timeOff", exact: true },
    { prefix: "/admin/dashboard/availability", label: "adminNav.availability" },
    { prefix: "/admin/dashboard/hours", label: "adminNav.hours" },
];

const NAV_ICON_MAP: Record<AdminNavigationIconKey, ReactNode> = {
    dashboard: <LayoutDashboard className="h-5 w-5 shrink-0" />,
    bookings: <Calendar className="h-5 w-5 shrink-0" />,
    services: <Scissors className="h-5 w-5 shrink-0" />,
    availability: <CalendarClock className="h-5 w-5 shrink-0" />,
    settings: <Settings className="h-5 w-5 shrink-0" />,
    events: <Calendar className="h-5 w-5 shrink-0" />,
    classes: <GraduationCap className="h-5 w-5 shrink-0" />,
    customers: <UserCheck className="h-5 w-5 shrink-0" />,
    crm: <Users className="h-5 w-5 shrink-0" />,
    messaging: <BellRing className="h-5 w-5 shrink-0" />,
    metrics: <BarChart3 className="h-5 w-5 shrink-0" />,
    storefront: <Store className="h-5 w-5 shrink-0" />,
    customization: <Sparkles className="h-5 w-5 shrink-0" />,
    hours: <Clock className="h-5 w-5 shrink-0" />,
    staff: <Users className="h-5 w-5 shrink-0" />,
    profile: <UserCircle className="h-5 w-5 shrink-0" />,
};

function routeMatches(prefix: string, currentPath: string, exact = false) {
    return exact ? currentPath === prefix : currentPath === prefix || currentPath.startsWith(`${prefix}/`);
}

function isNavItemActive(item: AdminNavigationItem, currentPath: string) {
    const prefixes = item.activePrefixes;
    return prefixes.some((prefix) => routeMatches(prefix, currentPath, item.exact));
}

function resolveHeaderTitleKey(currentPath: string, items: AdminNavigationItem[]) {
    const routeOverride = routeTitleOverrides.find((route) => routeMatches(route.prefix, currentPath, route.exact));
    if (routeOverride) return routeOverride.label;

    return [...items]
        .sort((a, b) => b.href.length - a.href.length)
        .find((item) => isNavItemActive(item, currentPath))
        ?.labelKey || "adminNav.dashboard";
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const {
        user,
        companyId,
        companyUsers,
        companyUser,
        isSwitchingShop,
        isAuthenticated,
        loading,
        mustChangePassword,
        switchActiveShop,
    } = useAdminAuth();
    const router = useRouter();
    const availableUntilRaw = companyUser?.company?.availableUntil;
    const availableUntilMs = availableUntilRaw ? new Date(availableUntilRaw).getTime() : Number.NaN;
    const isCompanyExpired = Boolean(
        !user?.is_super_admin &&
        Number.isFinite(availableUntilMs) &&
        Date.now() > availableUntilMs,
    );

    const expiredAt = useMemo(() => {
        if (!isCompanyExpired || !Number.isFinite(availableUntilMs)) return null;
        return new Date(availableUntilMs);
    }, [availableUntilMs, isCompanyExpired]);

    // Auth guard
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace("/admin/login");
            return;
        }
        if (!loading && isAuthenticated && mustChangePassword) {
            router.replace("/admin/change-password");
        }
    }, [loading, isAuthenticated, mustChangePassword, router]);

    // Loading state (before provider is ready)
    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-admin-brand border-t-transparent mx-auto" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated || mustChangePassword) {
        return null;
    }

    return (
        <I18nProvider defaultLocale={companyUser?.company?.default_language ?? 'es'}>
            {isCompanyExpired && expiredAt ? (
                <ExpiredAdminState
                    expiredAt={expiredAt}
                    companyId={companyId}
                    companyUsers={companyUsers}
                    isSwitchingShop={isSwitchingShop}
                    onSwitchShop={switchActiveShop}
                />
            ) : (
                <DashboardShell>{children}</DashboardShell>
            )}
        </I18nProvider>
    );
}

function ExpiredAdminState({
    expiredAt,
    companyId,
    companyUsers,
    isSwitchingShop,
    onSwitchShop,
}: {
    expiredAt: Date;
    companyId: number | null;
    companyUsers: Array<{
        id: number;
        company_id: number;
        role: string;
        company?: { name?: string };
    }>;
    isSwitchingShop: boolean;
    onSwitchShop: (companyId: number) => Promise<void>;
}) {
    const t = useT();
    const formattedDate = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                dateStyle: "long",
                timeStyle: "short",
            }).format(expiredAt),
        [expiredAt],
    );
    const showSwitcher = companyUsers.length > 1 && companyId;

    const handleSwitch = async (value: string) => {
        const nextCompanyId = Number.parseInt(value, 10);
        if (!Number.isInteger(nextCompanyId) || nextCompanyId <= 0) return;
        if (nextCompanyId === companyId) return;
        await onSwitchShop(nextCompanyId);
    };

    return (
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                    {t("adminSubscription.expiredTitle")}
                </h1>
                <p className="mt-3 text-base text-slate-600 md:text-lg">
                    {t("adminSubscription.expiredSubtitle")}
                </p>
                <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {t("adminSubscription.expiredBanner", { date: formattedDate })}
                </div>
                {showSwitcher ? (
                    <div className="mx-auto mt-5 max-w-sm">
                        <Select
                            value={companyId.toString()}
                            onValueChange={(value) => {
                                void handleSwitch(value).catch(() => undefined);
                            }}
                            disabled={isSwitchingShop}
                        >
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder={t("adminNav.currentShop")} />
                            </SelectTrigger>
                            <SelectContent>
                                {companyUsers.map((membership) => (
                                    <SelectItem
                                        key={membership.id}
                                        value={membership.company_id.toString()}
                                    >
                                        {membership.company?.name || `Shop #${membership.company_id}`} · {membership.role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}
                <div className="mt-7 flex items-center justify-center">
                    <Link href="/">
                        <Button className="bg-admin-brand text-white hover:bg-admin-brand-hover">
                            {t("shopHome.goHome")}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const currentPath = pathname ?? "";
    const router = useRouter();
    const {
        user,
        companyId,
        companyName,
        companySlug,
        companyUsers,
        isSwitchingShop,
        role,
        switchActiveShop,
        signOut,
    } = useAdminAuth();
    const t = useT();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const activeMembership = companyUsers.find((membership) => membership.company_id === companyId) ?? null;
    const companyCapabilities = activeMembership?.company?.capabilities ?? null;

    const hasMultipleShops = !user?.is_super_admin && companyUsers.length > 1;

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push("/admin/login");
        } catch {
            // Error handled in context
        }
    };

    const filteredNavGroups = useMemo<AdminNavigationGroup[]>(() => {
        const navigationGroups = getAdminNavigationForEntitlements(companyCapabilities);
        return navigationGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => Boolean(role && item.roles.includes(role as "OWNER" | "ADMIN" | "STAFF"))),
            }))
            .filter((group) => group.items.length > 0);
    }, [companyCapabilities, role]);
    const filteredNavItems = useMemo(
        () => filteredNavGroups.flatMap((group) => group.items),
        [filteredNavGroups],
    );
    const activeGroupId =
        filteredNavGroups.find((group) => group.items.some((item) => isNavItemActive(item, currentPath)))?.id ?? null;

    const getInitials = () => {
        if (user?.name) return user.name.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return "A";
    };

    const handleShopSwitch = async (value: string) => {
        const nextCompanyId = Number.parseInt(value, 10);
        if (!Number.isInteger(nextCompanyId) || nextCompanyId <= 0) return;
        if (nextCompanyId === companyId) return;

        try {
            await switchActiveShop(nextCompanyId);

            const nextMembership = companyUsers.find((m) => m.company_id === nextCompanyId);
            const nextGroups = getAdminNavigationForEntitlements(nextMembership?.company?.capabilities ?? null)
                .map((group) => ({
                    ...group,
                    items: group.items.filter((item) => Boolean(role && item.roles.includes(role as "OWNER" | "ADMIN" | "STAFF"))),
                }))
                .filter((group) => group.items.length > 0);
            const nextItems = nextGroups.flatMap((group) => group.items);
            const currentNavItem = filteredNavItems.find((item) => isNavItemActive(item, currentPath));
            const nextNavItem = currentNavItem
                ? nextItems.find((item) => item.id === currentNavItem.id) ?? null
                : null;

            router.replace(nextNavItem?.href ?? "/admin/dashboard");
            router.refresh();
        } catch {
            // Error state is handled in auth context.
        }
    };

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!activeGroupId) return;
        setExpandedGroups((current) => ({
            ...current,
            [activeGroupId]: true,
        }));
    }, [activeGroupId]);

    useEffect(() => {
        setExpandedGroups((current) => {
            const next = { ...current };
            for (const group of filteredNavGroups) {
                if (!(group.id in next)) {
                    next[group.id] = true;
                }
            }
            return next;
        });
    }, [filteredNavGroups]);

    return (
        <div className="flex h-[100dvh] overflow-hidden bg-admin-page">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - fixed height viewport */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 transform bg-admin-sidebar text-white shadow-2xl shadow-black/30 transition-transform duration-200 lg:relative lg:translate-x-0 lg:flex-shrink-0 lg:shadow-none",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex h-[100dvh] flex-col">
                    {/* Logo / Company Name */}
                    <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-4">
                        <div className="min-w-0">
                            <Image
                                src="/assets/priconpri/logo-horizontal-pink-outline.webp"
                                alt="PriConPri"
                                width={600}
                                height={370}
                                className="h-4 w-auto opacity-95"
                                priority
                            />
                            <div className="mt-3 flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-admin-brand text-[11px] font-bold text-white shadow-sm shadow-black/20">
                                    {companyName?.charAt(0) || "S"}
                                </div>
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-semibold text-white">
                                        {companyName || t("adminNav.shopAdmin")}
                                    </span>
                                    <span className="text-xs capitalize text-white/[0.52]">
                                        {role?.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5 shrink-0" />
                        </button>
                    </div>

                    {hasMultipleShops && companyId ? (
                        <div className="border-b border-white/10 px-4 py-3 lg:hidden">
                            <Select
                                value={companyId.toString()}
                                onValueChange={handleShopSwitch}
                                disabled={isSwitchingShop}
                            >
                                <SelectTrigger className="h-9 border-white/10 bg-white/[0.08] text-white">
                                    <SelectValue placeholder={t("adminNav.currentShop")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {companyUsers.map((membership) => (
                                        <SelectItem
                                            key={membership.id}
                                            value={membership.company_id.toString()}
                                        >
                                            {membership.company?.name || `Shop #${membership.company_id}`} · {membership.role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {/* Navigation */}
                    <nav className="admin-sidebar-scrollbar flex-1 overflow-y-auto px-3 py-4">
                        <div className="space-y-4">
                            {filteredNavGroups.map((group) => {
                                const isExpanded = expandedGroups[group.id] ?? true;
                                const isGroupActive = group.id === activeGroupId;

                                return (
                                    <section key={group.id} className="space-y-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedGroups((current) => ({
                                                    ...current,
                                                    [group.id]: !(current[group.id] ?? true),
                                                }))
                                            }
                                            className={cn(
                                                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                                                isGroupActive
                                                    ? "text-white"
                                                    : "text-white/[0.42] hover:bg-white/[0.06] hover:text-white/70",
                                            )}
                                            aria-expanded={isExpanded}
                                        >
                                            <span>{t(group.labelKey)}</span>
                                            <ChevronDown
                                                className={cn(
                                                    "h-3.5 w-3.5 transition-transform duration-200",
                                                    !isExpanded && "-rotate-90",
                                                )}
                                            />
                                        </button>
                                        {isExpanded ? (
                                            <div className="space-y-1">
                                                {group.items.map((item) => {
                                                    const isActive = isNavItemActive(item, currentPath);
                                                    const isLocked = item.state === "locked";
                                                    return (
                                                        <Link
                                                            key={item.id}
                                                            href={item.href}
                                                            className={cn(
                                                                "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                                                isActive
                                                                    ? "bg-admin-sidebar-active text-white shadow-sm ring-1 ring-admin-brand/25"
                                                                    : isLocked
                                                                        ? "text-white/[0.52] hover:bg-admin-sidebar-hover hover:text-white"
                                                                        : "text-white/[0.68] hover:bg-admin-sidebar-hover hover:text-white",
                                                            )}
                                                            onClick={() => setSidebarOpen(false)}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "text-white/[0.36] transition-colors group-hover:text-white/[0.72]",
                                                                    isActive && "text-admin-brand",
                                                                )}
                                                            >
                                                                {NAV_ICON_MAP[item.iconKey]}
                                                            </span>
                                                            <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                                                            {isLocked ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                                                                    <Lock className="h-3 w-3" />
                                                                    {t("common.locked")}
                                                                </span>
                                                            ) : null}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </section>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Super admin back link + View Shop Link */}
                    {(user?.is_super_admin || companySlug) && (
                        <div className="space-y-2 border-t border-white/10 p-4">
                            {user?.is_super_admin && (
                                <Link
                                    href="/admin/super-admin"
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/[0.56] transition-colors hover:bg-white/[0.08] hover:text-white"
                                >
                                    {`← ${t('adminNav.backToSuperAdmin')}`}
                                </Link>
                            )}
                            {companySlug && (
                                <Link
                                    href={`/shop/${companySlug}`}
                                    target="_blank"
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/[0.56] transition-colors hover:bg-white/[0.08] hover:text-white"
                                >
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                    {t('adminNav.backToShop')}
                                </Link>
                            )}
                        </div>
                    )}

                    {/* User Section */}
                    <div className="border-t border-white/10 bg-black/10 p-4">
                        <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.035] p-2">
                            <Avatar className="h-9 w-9 border border-white/10">
                                <AvatarImage src={user?.image ?? undefined} />
                                <AvatarFallback className="bg-admin-sidebar-hover text-white">
                                    {getInitials()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                    {user?.name || user?.email}
                                </p>
                                <p className="truncate text-xs text-white/[0.48]">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                                title={t('adminNav.signOut')}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                            </button>
                        </div>
                        <p className="mt-3 px-2 text-[11px] text-white/[0.34]">
                            Version: {APP_VERSION}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex min-w-0 flex-col h-[100dvh] overflow-hidden">
                {/* Top Header */}
                <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-3 border-b border-admin-border bg-admin-surface px-4 py-2 shadow-sm lg:px-6">
                    <button
                        className="rounded-lg p-2 transition-colors hover:bg-admin-brand-soft lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5 shrink-0" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold text-slate-900">
                            {t(resolveHeaderTitleKey(currentPath, filteredNavItems))}
                        </h1>
                    </div>
                    {hasMultipleShops && companyId ? (
                        <div className="hidden min-w-[220px] md:block">
                            <Select
                                value={companyId.toString()}
                                onValueChange={handleShopSwitch}
                                disabled={isSwitchingShop}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder={t("adminNav.currentShop")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {companyUsers.map((membership) => (
                                        <SelectItem
                                            key={membership.id}
                                            value={membership.company_id.toString()}
                                        >
                                            {membership.company?.name || `Shop #${membership.company_id}`} · {membership.role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}
                    <LanguageSwitcher variant="admin" />
                </header>

                {/* Page Content - scrollable */}
                <main className="admin-scrollbar flex-1 overflow-x-clip overflow-y-auto p-3 sm:p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
