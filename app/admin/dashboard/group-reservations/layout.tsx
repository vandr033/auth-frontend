"use client";

import { AdminPageHeader } from "@/app/admin/dashboard/components/AdminPageHeader";
import { useT } from "@/lib/i18n";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { GroupReservationsTabs } from "./components/GroupReservationsTabs";
import { useGroupReservationsAccess } from "./lib/useGroupReservationsAccess";

export default function GroupReservationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = useT();
    const { plan, canUseEvents, isOwnerOrAdmin } = useGroupReservationsAccess();

    if (!isOwnerOrAdmin) {
        return (
            <div className="space-y-4">
                <AdminPageHeader
                    title={t("adminGroup.title")}
                    subtitle={t("adminGroup.subtitle")}
                />
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {t("adminGroup.roleRestricted")}
                </p>
            </div>
        );
    }

    if (!canUseEvents) {
        return (
            <div className="space-y-4">
                <AdminPageHeader
                    title={t("adminGroup.title")}
                    subtitle={t("adminGroup.subtitle")}
                />
                <PlanUpgradeNotice
                    title={t("planEnforcement.featureLockedTitle")}
                    message={t("planEnforcement.availableOnBusiness")}
                    feature="GROUP_EVENTS"
                    currentPlan={plan}
                    requiredPlan="BUSINESS"
                    fullPage
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AdminPageHeader
                title={t("adminGroup.title")}
                subtitle={t("adminGroup.subtitle")}
            />
            <GroupReservationsTabs />
            <div>{children}</div>
        </div>
    );
}
