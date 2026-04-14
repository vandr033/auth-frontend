"use client";

import { useMemo } from "react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";

export function useGroupReservationsAccess() {
    const { companyUser, user, role } = useAdminAuth();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
    const isStaff = role === "STAFF";

    const access = useMemo(
        () => ({
            plan,
            isSuperAdmin,
            isOwnerOrAdmin,
            isStaff,
            canAccessAttendance: isSuperAdmin || canUsePlanFeature(plan, "GROUP_EVENTS") || canUsePlanFeature(plan, "GROUP_CLASSES") || canUsePlanFeature(plan, "GROUP_ADVANCED"),
            canUseEvents: isSuperAdmin || canUsePlanFeature(plan, "GROUP_EVENTS"),
            canUseClasses: isSuperAdmin || canUsePlanFeature(plan, "GROUP_CLASSES"),
            canUseAdvanced: isSuperAdmin || canUsePlanFeature(plan, "GROUP_ADVANCED"),
        }),
        [isSuperAdmin, plan, isOwnerOrAdmin, isStaff],
    );

    return access;
}
