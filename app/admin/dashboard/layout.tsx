"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/appVersion";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { I18nProvider, useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
    roles?: string[];
};

const navItems: NavItem[] = [
    {
        label: "adminNav.dashboard",
        href: "/admin/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
    {
        label: "adminNav.bookings",
        href: "/admin/dashboard/bookings",
        icon: <Calendar className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
    {
        label: "adminNav.services",
        href: "/admin/dashboard/services",
        icon: <Scissors className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.staff",
        href: "/admin/dashboard/staff",
        icon: <Users className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.customers",
        href: "/admin/dashboard/customers",
        icon: <UserCheck className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.availability",
        href: "/admin/dashboard/availability",
        icon: <Calendar className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
    {
        label: "adminNav.hours",
        href: "/admin/dashboard/hours",
        icon: <Clock className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.theme",
        href: "/admin/dashboard/theme",
        icon: <Palette className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.pages",
        href: "/admin/dashboard/page-management",
        icon: <FileText className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.settings",
        href: "/admin/dashboard/settings",
        icon: <Settings className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN"],
    },
    {
        label: "adminNav.profile",
        href: "/admin/dashboard/profile",
        icon: <UserCircle className="h-5 w-5" />,
        roles: ["OWNER", "ADMIN", "STAFF"],
    },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const {
        companyUser,
        isAuthenticated,
        loading,
        mustChangePassword,
    } = useAdminAuth();
    const router = useRouter();

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
            <DashboardShell>{children}</DashboardShell>
        </I18nProvider>
    );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const {
        user,
        companyName,
        companySlug,
        role,
        signOut,
    } = useAdminAuth();
    const t = useT();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        console.info(`[reservas-admin] APP_VERSION=${APP_VERSION}`);
    }, []);

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
        return role && item.roles.includes(role);
    });

    const getInitials = () => {
        if (user?.name) return user.name.charAt(0).toUpperCase();
        if (user?.email) return user.email.charAt(0).toUpperCase();
        return "A";
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
                                        {companyName || "Shop Admin"}
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
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        {filteredNavItems.map((item) => {
                            const isActive = pathname === item.href;
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
                                    <ChevronRight className="h-4 w-4" />
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
            <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
                {/* Top Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-6 shadow-sm">
                    <button
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-900">
                            {t(filteredNavItems.find((item) => item.href === pathname)?.label || 'adminNav.dashboard')}
                        </h1>
                    </div>
                    <LanguageSwitcher variant="admin" />
                </header>

                {/* Page Content - scrollable */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
