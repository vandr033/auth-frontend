"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { EntitlementLockedCard } from "@/components/admin/product/EntitlementLockedCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getProductAccessRecommendationForCapability } from "@/lib/product-access";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ProductAccessRequestSource, ProductCapability } from "@/types/product-access";

type LockedFeatureButtonProps = {
    capability: ProductCapability;
    title: string;
    description: string;
    buttonLabel: string;
    source: ProductAccessRequestSource;
    className?: string;
};

export function LockedFeatureButton({
    capability,
    title,
    description,
    buttonLabel,
    source,
    className,
}: LockedFeatureButtonProps) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const recommendation = getProductAccessRecommendationForCapability(capability);

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(true)}
                aria-disabled="true"
                className={cn(
                    "w-full justify-between border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 sm:w-auto",
                    className,
                )}
            >
                <span className="inline-flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {buttonLabel}
                </span>
                <Badge variant="outline" className="border-amber-300 bg-white text-amber-800">
                    {recommendation.requestLabel}
                </Badge>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            {t("entitlements.moduleNotActive")}
                        </DialogDescription>
                    </DialogHeader>

                    <EntitlementLockedCard
                        title={title}
                        description={description}
                        capability={capability}
                        source={source}
                        notice={t("entitlements.requiresProduct", {
                            productName: recommendation.requestLabel,
                        })}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
