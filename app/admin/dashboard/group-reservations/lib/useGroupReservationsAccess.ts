"use client";

import { useMemo } from "react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    canUseEntitledFeature,
    getCurrentPlan,
    getRequiredPlanForFeature,
    type PlanFeatureKey,
} from "@/lib/plans/capabilities";

export function useGroupReservationsAccess() {
    const { companyUser, user, role } = useAdminAuth();
    const plan = getCurrentPlan(companyUser?.company);
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

    const access = useMemo(
        () => ({
            plan,
            isSuperAdmin,
            isOwnerOrAdmin,
            canUseEvents: isSuperAdmin || canUseEntitledFeature(companyUser?.company, "GROUP_EVENTS"),
            canUseClasses: isSuperAdmin || canUseEntitledFeature(companyUser?.company, "GROUP_CLASSES"),
            canUseAdvanced: isSuperAdmin || canUseEntitledFeature(companyUser?.company, "GROUP_ADVANCED"),
            canAccessGroupReservations:
                isSuperAdmin ||
                canUseEntitledFeature(companyUser?.company, "GROUP_EVENTS") ||
                canUseEntitledFeature(companyUser?.company, "GROUP_CLASSES"),
            getRequiredPlan: (feature: PlanFeatureKey) => getRequiredPlanForFeature(companyUser?.company, feature),
        }),
        [companyUser?.company, isSuperAdmin, plan, isOwnerOrAdmin],
    );

    return access;
}
