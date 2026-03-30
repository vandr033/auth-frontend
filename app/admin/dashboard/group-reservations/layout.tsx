"use client";

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
                <h1 className="text-2xl font-bold text-slate-900">{t("adminGroup.title")}</h1>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {t("adminGroup.roleRestricted")}
                </p>
            </div>
        );
    }

    if (!canUseEvents) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-slate-900">{t("adminGroup.title")}</h1>
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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("adminGroup.title")}</h1>
                <p className="text-sm text-slate-600">{t("adminGroup.subtitle")}</p>
            </div>
            <GroupReservationsTabs />
            <div>{children}</div>
        </div>
    );
}
