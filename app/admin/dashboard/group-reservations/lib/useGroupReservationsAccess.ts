"use client";

import { useMemo } from "react";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    getRequiredPlanForFeature,
    type PlanFeatureKey,
} from "@/lib/plans/capabilities";
import { hasEffectiveFeature } from "@/lib/admin/access";

export function useGroupReservationsAccess() {
    const { effectiveAccess, user, role } = useAdminAuth();
    const plan = effectiveAccess?.entitlements.currentPlan ?? "BUSINESS";
    const isSuperAdmin = Boolean(user?.is_super_admin);
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

    const access = useMemo(
        () => ({
            plan,
            isSuperAdmin,
            isOwnerOrAdmin,
            canUseEvents: isSuperAdmin || hasEffectiveFeature(effectiveAccess, "GROUP_EVENTS"),
            canUseClasses: isSuperAdmin || hasEffectiveFeature(effectiveAccess, "GROUP_CLASSES"),
            canUseAdvanced: isSuperAdmin || hasEffectiveFeature(effectiveAccess, "GROUP_ADVANCED"),
            canAccessGroupReservations:
                isSuperAdmin ||
                hasEffectiveFeature(effectiveAccess, "GROUP_EVENTS") ||
                hasEffectiveFeature(effectiveAccess, "GROUP_CLASSES"),
            getRequiredPlan: (feature: PlanFeatureKey) =>
                getRequiredPlanForFeature(effectiveAccess?.entitlements, feature),
        }),
        [effectiveAccess, isSuperAdmin, plan, isOwnerOrAdmin],
    );

    return access;
}
