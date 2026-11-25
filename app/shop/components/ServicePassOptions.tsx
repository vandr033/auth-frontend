"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShop } from "../contexts/ShopContext";
import { getPublicServicePasses, type ServicePassOffering } from "../lib/servicePassesApi";
import { buildPublicPassBookingPath } from "@/lib/admin/public-links";
import { formatCurrencyFromCents } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export function usePublicPassOptions() {
    const { company, isShopActive, publicFeatures } = useShop();
    const companyId = isShopActive && publicFeatures.servicesVisible ? company?.id : undefined;
    const [result, setResult] = useState<{ companyId: number; offerings: ServicePassOffering[] }>();
    useEffect(() => {
        if (!companyId) return;
        let active = true;
        getPublicServicePasses(companyId)
            .then(({ offerings }) => { if (active) setResult({ companyId, offerings }); })
            .catch(() => { if (active) setResult({ companyId, offerings: [] }); });
        return () => { active = false; };
    }, [companyId]);

    return {
        offerings: result && result.companyId === companyId ? result.offerings : [],
        loading: Boolean(companyId && result?.companyId !== companyId),
    };
}

export function ServicePassOptions({
    offerings,
    selectedId,
    onSelect,
}: {
    offerings: ServicePassOffering[];
    selectedId?: number;
    onSelect?: (id: number) => void;
}) {
    const { company, slug } = useShop();
    const t = useT();
    if (!offerings.length) return null;

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("shopPasses.title")}</h3>
            <ul className="grid gap-2">
                {offerings.map((offering) => {
                    const selected = selectedId === offering.id;
                    const className = cn(
                        "flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                        selected ? "border-l-4 border-brand bg-brand/5" : "border-surface-border hover:border-brand/40 hover:bg-surface",
                    );
                    const details = (
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-semibold">
                                <span>{offering.title}</span>
                                <span className="text-sm text-brand">{formatCurrencyFromCents(offering.price_cents, company?.currency)}</span>
                            </div>
                            {offering.description && <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{offering.description}</p>}
                            <p className="mt-1 text-xs text-text-muted">{t(offering.duration === "DAY" ? "shopPasses.day" : "shopPasses.month")}</p>
                        </div>
                    );

                    return (
                        <li key={offering.id}>
                            {onSelect ? (
                                <button type="button" className={className} aria-pressed={selected} onClick={() => onSelect(offering.id)}>
                                    {details}
                                    <span aria-hidden="true" className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", selected ? "border-brand bg-brand text-white" : "border-surface-border")}>
                                        {selected && <Check className="size-4" />}
                                    </span>
                                </button>
                            ) : (
                                <Link href={buildPublicPassBookingPath(slug, offering.id)} className={className}>
                                    {details}
                                    <span className="shrink-0 text-sm font-semibold text-brand">{t("shopPasses.reserve")} →</span>
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
