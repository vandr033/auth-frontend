"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    LayoutDashboard,
    Tags,
    LogOut,
    Menu,
    X,
    Shield,
    Store,
    CalendarDays,
    Users,
    UserRound,
    UserCheck,
    Building2,
    MessageSquare,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/appVersion";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";

type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number | null;
};

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useT();
    const router = useRouter();
    const pathname = usePathname();
    const currentPathname = pathname ?? "";
    const { user, isAuthenticated, isSuperAdmin, loading, mustChangePassword, signOut } = useAdminAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [todayBookingsCount, setTodayBookingsCount] = useState<number | null>(null);

    useEffect(() => {
        console.info(`[reservas-super-admin] APP_VERSION=${APP_VERSION}`);
    }, []);

    // Fetch today's bookings count for badge
    useEffect(() => {
        if (!isAuthenticated || !isSuperAdmin) return;
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001/api";
        fetch(`${base}/super-admin/bookings/today-count`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
                if (data.data?.count != null) setTodayBookingsCount(data.data.count);
            })
            .catch(() => {});
    }, [isAuthenticated, isSuperAdmin]);

    const navItems: NavItem[] = [
        {
            label: t("adminNav.dashboard"),
            href: "/admin/super-admin",
            icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
            label: t("adminNav.shops"),
            href: "/admin/super-admin/shops",
            icon: <Store className="h-5 w-5" />,
        },
        {
            label: t("adminNav.bookings"),
            href: "/admin/super-admin/bookings",
            icon: <CalendarDays className="h-5 w-5" />,
            badge: todayBookingsCount,
        },
        {
            label: t("adminNav.customers"),
            href: "/admin/super-admin/customers",
            icon: <Users className="h-5 w-5" />,
        },
        {
            label: t("adminNav.allUsers"),
            href: "/admin/super-admin/users",
            icon: <UserRound className="h-5 w-5" />,
        },
        {
            label: t("adminNav.staff"),
            href: "/admin/super-admin/staff",
            icon: <UserCheck className="h-5 w-5" />,
        },
        {
            label: t("adminNav.companyTypes"),
            href: "/admin/super-admin/company-types",
            icon: <Building2 className="h-5 w-5" />,
        },
        {
            label: t("adminNav.serviceTypes"),
            href: "/admin/super-admin/service-types",
            icon: <Tags className="h-5 w-5" />,
        },
        {
            label: t("adminNav.testNotifications"),
            href: "/admin/super-admin/test-notifications",
            icon: <MessageSquare className="h-5 w-5" />,
        },
    ];

    // Auth guard - must be super admin
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace("/admin/login");
            return;
        }
        if (!loading && isAuthenticated && mustChangePassword) {
            router.replace("/admin/change-password");
            return;
        }
        if (!loading && isAuthenticated && !isSuperAdmin) {
            router.replace("/admin/dashboard");
        }
    }, [loading, isAuthenticated, isSuperAdmin, mustChangePassword, router]);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push("/admin/login");
        } catch {
            // Error handled silently, redirect anyway
            router.push("/admin/login");
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent mx-auto" />
                    <p className="text-slate-400">{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    // Not authenticated or not super admin
    if (!isAuthenticated || !isSuperAdmin || mustChangePassword) {
        return null;
    }

    const getInitials = () => {
        if (user?.name) return user.name.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return "S";
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

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 lg:flex-shrink-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex h-[100dvh] flex-col">
                    {/* Logo / Title */}
                    <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <Image
                                    src="/assets/priconpri/logo-horizontal-pink-outline.webp"
                                    alt="PriConPri"
                                    width={600}
                                    height={370}
                                    className="mb-0.5 h-3.5 w-auto"
                                    priority
                                />
                                <span className="font-semibold text-sm">
                                    {t("adminNav.superAdmin")}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {t("superAdminLayout.systemManagement")}
                                </span>
                            </div>
                        </div>
                        <button
                            className="lg:hidden p-1 hover:bg-slate-800 rounded"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive =
                                currentPathname === item.href ||
                                currentPathname.startsWith(item.href + "/");
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
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge != null && item.badge > 0 && (
                                        <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

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
                                <p className="text-xs text-brand truncate">{t("adminNav.superAdmin")}</p>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                title={t("adminNav.signOut")}
                            >
                                <LogOut className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-500">
                            Version: {APP_VERSION}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden lg:ml-64">
                {/* Top Header */}
                <header className="shrink-0 sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6 shadow-sm">
                    <button
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-900">
                            {[...navItems]
                                .sort((a, b) => b.href.length - a.href.length)
                                .find(
                                    (item) =>
                                        currentPathname === item.href ||
                                        currentPathname.startsWith(item.href + "/"),
                                )?.label ||
                                t("adminNav.superAdmin")}
                        </h1>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100">{children}</main>
            </div>
        </div>
    );
}
