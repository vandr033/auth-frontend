"use client";

import { Lock, Sparkles } from "lucide-react";

import { RequestProductCTA } from "@/components/admin/product/RequestProductCTA";
import type { ProductAccessRecommendation } from "@/types/product-access";
import { useT } from "@/lib/i18n";

type AdminLockedModuleStateProps = {
    titleKey: string;
    descriptionKey: string;
    featureKeys: string[];
    recommendation: ProductAccessRecommendation;
};

export function AdminLockedModuleState({
    titleKey,
    descriptionKey,
    featureKeys,
    recommendation,
}: AdminLockedModuleStateProps) {
    const t = useT();

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                            <Lock className="h-3.5 w-3.5" />
                            {recommendation.requestLabel}
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                                {t(titleKey)}
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                {t(descriptionKey)}
                            </p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 shadow-sm lg:max-w-sm">
                        <p className="font-semibold text-slate-900">{t("adminModules.requestHintTitle")}</p>
                        <p className="mt-2 leading-6">
                            {t("adminModules.requestHintBody", { productName: recommendation.requestLabel })}
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {featureKeys.map((featureKey) => (
                        <div
                            key={featureKey}
                            className="rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-sm"
                        >
                            <Sparkles className="mb-3 h-4 w-4 text-amber-500" />
                            <p className="leading-6">{t(featureKey)}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-2xl">
                <RequestProductCTA
                    productCode={recommendation.productCode}
                    tierCode={recommendation.tierCode}
                    capability={recommendation.capability}
                    title={recommendation.title}
                    description={recommendation.description}
                    ctaLabel={recommendation.ctaLabel}
                    source="SIDEBAR_LOCKED_ITEM"
                    className="border-slate-200 bg-white shadow-sm"
                />
            </section>
        </div>
    );
}
