"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./contexts/AdminAuthContext";

export default function AdminIndexPage() {
    const router = useRouter();
    const { loading, isAuthenticated, isSuperAdmin, companyUser } = useAdminAuth();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            // Not logged in → go to login
            router.replace("/admin/login");
            return;
        }

        // Logged in - determine where to go
        if (isSuperAdmin && !companyUser) {
            // Super admin without company context → super admin panel
            router.replace("/admin/super-admin");
        } else {
            // Regular admin/staff with company → regular dashboard
            router.replace("/admin/dashboard");
        }
    }, [loading, isAuthenticated, isSuperAdmin, companyUser, router]);

    // Show loading while determining redirect
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
            <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
                <p className="text-slate-400">Loading...</p>
            </div>
        </div>
    );
}
