"use client";

import { useMemo } from "react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import { canUsePlanFeature, resolveShopPlan } from "@/lib/plans/capabilities";

export function useGroupReservationsAccess() {
    const { companyUser, user, role } = useAdminAuth();
    const plan = resolveShopPlan(companyUser?.company?.plan);
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

    const access = useMemo(
        () => ({
            plan,
            isSuperAdmin,
            isOwnerOrAdmin,
            canUseEvents: isSuperAdmin || canUsePlanFeature(plan, "GROUP_EVENTS"),
            canUseClasses: isSuperAdmin || canUsePlanFeature(plan, "GROUP_CLASSES"),
            canUseAdvanced: isSuperAdmin || canUsePlanFeature(plan, "GROUP_ADVANCED"),
        }),
        [isSuperAdmin, plan, isOwnerOrAdmin],
    );

    return access;
}
