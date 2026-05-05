"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./contexts/AdminAuthContext";
import { useT } from "@/lib/i18n";
import { getDefaultAdminHref } from "@/lib/admin/navigation";

export default function AdminIndexPage() {
    const router = useRouter();
    const t = useT();
    const {
        loading,
        isAuthenticated,
        isSuperAdmin,
        mustChangePassword,
        companyUser,
        role,
    } = useAdminAuth();
    const navigationRole = role as "OWNER" | "ADMIN" | "STAFF" | null;

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            // Not logged in → go to login
            router.replace("/admin/login");
            return;
        }

        if (mustChangePassword) {
            router.replace("/admin/change-password");
            return;
        }

        // Logged in - determine where to go
        if (isSuperAdmin) {
            // Super admins should always land in their panel by default.
            router.replace("/admin/super-admin");
        } else {
            router.replace(getDefaultAdminHref(companyUser?.company?.capabilities, navigationRole));
        }
    }, [
        companyUser?.company?.capabilities,
        isAuthenticated,
        isSuperAdmin,
        loading,
        mustChangePassword,
        navigationRole,
        router,
    ]);

    // Show loading while determining redirect
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-admin-brand border-t-transparent mx-auto" />
                <p className="text-slate-400">{t('common.loading')}</p>
            </div>
        </div>
    );
}
