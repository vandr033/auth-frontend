"use client";

import { Lock } from "lucide-react";

import { RequestProductCTA } from "@/components/admin/product/RequestProductCTA";
import { getProductAccessRecommendationForCapability } from "@/lib/product-access";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
    ProductAccessRecommendation,
    ProductAccessRequestSource,
    ProductCapability,
} from "@/types/product-access";

type EntitlementLockedCardProps = {
    title: string;
    description: string;
    source: ProductAccessRequestSource;
    capability?: ProductCapability;
    recommendation?: ProductAccessRecommendation;
    notice?: string;
    className?: string;
    compact?: boolean;
};

export function EntitlementLockedCard({
    title,
    description,
    source,
    capability,
    recommendation: recommendationProp,
    notice,
    className,
    compact = false,
}: EntitlementLockedCardProps) {
    const t = useT();
    const recommendation = recommendationProp ?? (
        capability ? getProductAccessRecommendationForCapability(capability) : null
    );

    if (!recommendation) {
        return null;
    }

    const requiresLabel = t("entitlements.requiresProduct", {
        productName: recommendation.requestLabel,
    });

    return (
        <section
            className={cn(
                "rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-5 shadow-sm",
                compact ? "space-y-4" : "space-y-5",
                className,
            )}
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                        <Lock className="h-3.5 w-3.5" />
                        {requiresLabel}
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                            {title}
                        </h2>
                        <p className="max-w-3xl text-sm leading-6 text-slate-600">
                            {description}
                        </p>
                    </div>
                </div>
                {notice ? (
                    <p className="max-w-md rounded-xl border border-slate-200 bg-white/85 px-4 py-3 text-sm leading-6 text-slate-600">
                        {notice}
                    </p>
                ) : null}
            </div>

            <RequestProductCTA
                productCode={recommendation.productCode}
                tierCode={recommendation.tierCode}
                capability={recommendation.capability}
                title={title}
                description={description}
                ctaLabel={t("entitlements.requestProduct", { productName: recommendation.requestLabel })}
                source={source}
                className="border-slate-200 bg-white/90"
                hideSummary
            />
        </section>
    );
}
