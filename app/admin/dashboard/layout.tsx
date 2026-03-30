"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    LayoutDashboard,
    Calendar,
    Scissors,
    Users,
    UserCheck,
    UserCircle,
    Clock,
    Palette,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    FileText,
    Star,
    Ticket,
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
    canUsePlanFeature,
    resolveShopPlan,
    type PlanFeatureKey,
} from "@/lib/plans/capabilities";

type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
    roles?: string[];
    feature?: PlanFeatureKey;
};

const navItems: NavItem[] = [
    {
        label: "adminNav.dashboard",
        href: "/admin/dashboard",
        icon: <LayoutDashboard className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
        feature: "OPERATIONAL_DASHBOARD",
    },
    {
        label: "adminNav.bookings",
        href: "/admin/dashboard/bookings",
        icon: <Calendar className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
    {
        label: "adminNav.groupReservations",
        href: "/admin/dashboard/group-reservations",
        icon: <Ticket className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.services",
        href: "/admin/dashboard/services",
        icon: <Scissors className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.staff",
        href: "/admin/dashboard/staff",
        icon: <Users className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.customers",
        href: "/admin/dashboard/customers",
        icon: <UserCheck className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.reviews",
        href: "/admin/dashboard/reviews",
        icon: <Star className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
        feature: "REVIEW_MANAGEMENT",
    },
    {
        label: "adminNav.availability",
        href: "/admin/dashboard/availability",
        icon: <Calendar className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
        feature: "STAFF_AVAILABILITY",
    },
    {
        label: "adminNav.hours",
        href: "/admin/dashboard/hours",
        icon: <Clock className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.theme",
        href: "/admin/dashboard/theme",
        icon: <Palette className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.pages",
        href: "/admin/dashboard/page-management",
        icon: <FileText className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.settings",
        href: "/admin/dashboard/settings",
        icon: <Settings className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.profile",
        href: "/admin/dashboard/profile",
        icon: <UserCircle className="h-5 w-5 shrink-0" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
];

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
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
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
                        <Button className="bg-brand text-white hover:bg-brand-hover">
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
    const activePlan = resolveShopPlan(activeMembership?.company?.plan);

    useEffect(() => {
        console.info(`[reservas-admin] APP_VERSION=${APP_VERSION}`);
    }, []);

    const hasMultipleShops = !user?.is_super_admin && companyUsers.length > 1;

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push("/admin/login");
        } catch {
            // Error handled in context
        }
    };

    // Filter nav items based on role
    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles) return true;
        if (!role || !item.roles.includes(role)) return false;
        if (!item.feature) return true;
        if (user?.is_super_admin) return true;
        return canUsePlanFeature(activePlan, item.feature);
    });

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

            // If the current page is feature-gated, check whether the new
            // shop's plan supports it. If not, redirect to bookings so the
            // user never sees a "feature locked" dead-end after switching.
            const nextMembership = companyUsers.find((m) => m.company_id === nextCompanyId);
            const nextPlan = resolveShopPlan(nextMembership?.company?.plan);
            const currentNavItem = navItems.find((item) => item.href === currentPath || currentPath.startsWith(`${item.href}/`));

            const isCurrentPageLocked =
                currentNavItem?.feature &&
                !user?.is_super_admin &&
                !canUsePlanFeature(nextPlan, currentNavItem.feature);

            router.replace(isCurrentPageLocked ? "/admin/dashboard/bookings" : "/admin/dashboard");
            router.refresh();
        } catch {
            // Error state is handled in auth context.
        }
    };

    return (
        <div className="flex h-[100dvh] bg-slate-100 overflow-hidden">
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
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-white transition-transform duration-200 lg:relative lg:translate-x-0 lg:flex-shrink-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex h-[100dvh] flex-col">
                    {/* Logo / Company Name */}
                    <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                        <div className="min-w-0">
                            <Image
                                src="/assets/priconpri/logo-horizontal-pink-outline.png"
                                alt="PriConPri"
                                width={600}
                                height={370}
                                className="h-4 w-auto"
                                priority
                            />
                            <div className="mt-1 flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white">
                                    {companyName?.charAt(0) || "S"}
                                </div>
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-semibold">
                                        {companyName || t("adminNav.shopAdmin")}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">
                                        {role?.toLowerCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            className="lg:hidden p-1 hover:bg-slate-800 rounded"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5 shrink-0" />
                        </button>
                    </div>

                    {hasMultipleShops && companyId ? (
                        <div className="border-b border-slate-800 px-4 py-3 lg:hidden">
                            <Select
                                value={companyId.toString()}
                                onValueChange={handleShopSwitch}
                                disabled={isSwitchingShop}
                            >
                                <SelectTrigger className="h-9 border-slate-700 bg-slate-800 text-white">
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
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {filteredNavItems.map((item) => {
                                    const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                        isActive
                                            ? "bg-brand text-white"
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white",
                                    )}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    {item.icon}
                                    {t(item.label)}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Super admin back link + View Shop Link */}
                    {(user?.is_super_admin || companySlug) && (
                        <div className="border-t border-slate-800 p-4 space-y-2">
                            {user?.is_super_admin && (
                                <Link
                                    href="/admin/super-admin"
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    {`← ${t('adminNav.backToSuperAdmin')}`}
                                </Link>
                            )}
                            {companySlug && (
                                <Link
                                    href={`/shop/${companySlug}`}
                                    target="_blank"
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                    {t('adminNav.backToShop')}
                                </Link>
                            )}
                        </div>
                    )}

                    {/* User Section */}
                    <div className="border-t border-slate-800 p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-slate-700">
                                <AvatarImage src={user?.image ?? undefined} />
                                <AvatarFallback className="bg-slate-700 text-white">
                                    {getInitials()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {user?.name || user?.email}
                                </p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                title={t('adminNav.signOut')}
                            >
                                <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-500">
                            Version: {APP_VERSION}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
                {/* Top Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6 shadow-sm">
                    <button
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5 shrink-0" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-900">
                            {t(
                                [...filteredNavItems]
                                    .sort((a, b) => b.href.length - a.href.length)
                                    .find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`))
                                    ?.label || "adminNav.dashboard",
                            )}
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
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
