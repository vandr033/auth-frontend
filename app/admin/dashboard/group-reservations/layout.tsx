"use client";

import { CircleSlash } from "lucide-react";
import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { useT } from "@/lib/i18n";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { AdminPageShell, ErrorState } from "@/components/admin/shared";
import { GroupReservationsTabs } from "./components/GroupReservationsTabs";
import { useGroupReservationsAccess } from "./lib/useGroupReservationsAccess";

export default function GroupReservationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useT();
    const { plan, canUseEvents, getRequiredPlan, isOwnerOrAdmin } = useGroupReservationsAccess();

    if (!isOwnerOrAdmin) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("adminGroup.title")}
                    subtitle={t("adminGroup.subtitle")}
                />
                <ErrorState
                    icon={CircleSlash}
                    title={t("adminGroup.accessRestrictedTitle")}
                    description={t("adminGroup.roleRestricted")}
                />
            </AdminPageShell>
        );
    }

    if (!canUseEvents) {
        const requiredPlan = getRequiredPlan("GROUP_EVENTS");
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("adminGroup.title")}
                    subtitle={t("adminGroup.subtitle")}
                />
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                    feature="GROUP_EVENTS"
                    currentPlan={plan}
                    requiredPlan={requiredPlan}
                    fullPage
                />
            </AdminPageShell>
        );
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("adminGroup.title")}
                subtitle={t("adminGroup.subtitle")}
            />
            <GroupReservationsTabs />
            <div>{children}</div>
        </AdminPageShell>
    );
}
