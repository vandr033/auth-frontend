"use client";

import { Lock } from "lucide-react";

import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
import { cn } from "@/lib/utils";
import type {
    ProductAccessRecommendation,
    ProductAccessRequestSource,
    ProductCapability,
} from "@/types/product-access";

type EntitlementLockedBannerProps = {
    title: string;
    description: string;
    source: ProductAccessRequestSource;
    capability?: ProductCapability;
    recommendation?: ProductAccessRecommendation;
    notice?: string;
    className?: string;
};

export function EntitlementLockedBanner({
    title,
    description,
    source,
    capability,
    recommendation,
    notice,
    className,
}: EntitlementLockedBannerProps) {
    return (
        <div className={cn("rounded-2xl border border-amber-200 bg-amber-50/80 p-1", className)}>
            <div className="flex items-center gap-2 border-b border-amber-200/80 px-4 py-3 text-sm font-medium text-amber-900">
                <Lock className="h-4 w-4" />
                {title}
            </div>
            <EntitlementLockedCard
                title={title}
                description={description}
                source={source}
                capability={capability}
                recommendation={recommendation}
                notice={notice}
                compact
                className="border-0 bg-transparent p-4 shadow-none"
            />
        </div>
    );
}
