"use client";

import { AlertTriangle, Lock, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { PlanFeatureKey, ShopPlan } from "@/lib/plans/capabilities";
import { FEATURE_DESCRIPTION_KEY, FEATURE_LABEL_KEY } from "@/lib/plans/capabilities";

interface PlanUpgradeNoticeProps {
    title: string;
    message: string;
    className?: string;
    /** When provided, shows feature name + description */
    feature?: PlanFeatureKey;
    /** Current plan of the shop */
    currentPlan?: ShopPlan;
    /** Required plan for the feature */
    requiredPlan?: ShopPlan;
    /** Render as a full-page blocking state (e.g. dashboard, availability) */
    fullPage?: boolean;
}

export function PlanUpgradeNotice({
    title,
    message,
    className,
    feature,
    currentPlan,
    requiredPlan,
    fullPage,
}: PlanUpgradeNoticeProps) {
    const t = useT();

    const featureLabel = feature ? t(FEATURE_LABEL_KEY[feature]) : null;
    const featureDesc = feature ? t(FEATURE_DESCRIPTION_KEY[feature]) : null;

    if (fullPage) {
        return (
            <div className={`mx-auto max-w-lg py-12 text-center ${className || ""}`}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                    <Lock className="h-7 w-7 text-amber-600" />
                </div>

                {featureLabel && (
                    <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-amber-600">
                        {featureLabel}
                    </p>
                )}

                <h3 className="mt-3 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{message}</p>

                {featureDesc && (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700">
                        <Sparkles className="mb-0.5 mr-1.5 inline-block h-4 w-4 shrink-0 text-amber-500" />
                        {featureDesc}
                    </p>
                )}

                {(currentPlan || requiredPlan) && (
                    <div className="mt-5 flex items-center justify-center gap-3 text-xs text-slate-500">
                        {currentPlan && (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                                {t("planEnforcement.currentPlan", { plan: currentPlan })}
                            </span>
                        )}
                        {currentPlan && requiredPlan && <span>&rarr;</span>}
                        {requiredPlan && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
                                {t("planEnforcement.requiredPlan", { plan: requiredPlan })}
                            </span>
                        )}
                    </div>
                )}

                <p className="mt-5 text-xs text-slate-400">
                    {t("planEnforcement.upgradePrompt")}
                </p>
            </div>
        );
    }

    // Inline banner variant (used inside pages like staff, customers, bookings)
    return (
        <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 ${className || ""}`}>
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{title}</p>
                        {featureLabel && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                                {featureLabel}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm">{message}</p>
                    {featureDesc && (
                        <p className="mt-2 text-xs leading-relaxed text-amber-800/80">
                            {featureDesc}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
