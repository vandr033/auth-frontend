"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminProductAccessRequest, getAdminProductAccessRequests } from "@/app/admin/lib/adminApi";
import { notify } from "@/lib/notify";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
    ProductAccessRequestRow,
    ProductAccessRequestSource,
    ProductCapability,
    ProductCode,
    ProductTierCode,
} from "@/types/product-access";

interface RequestProductCTAProps {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    capability: ProductCapability;
    title: string;
    description: string;
    ctaLabel: string;
    source: ProductAccessRequestSource;
    className?: string;
    fullPage?: boolean;
    hideSummary?: boolean;
}

function getRequestLabel(ctaLabel: string): string {
    return ctaLabel.replace(/^(Solicitar|Request)\s+/i, "").trim() || ctaLabel;
}

export function RequestProductCTA({
    productCode,
    tierCode,
    capability,
    title,
    description,
    ctaLabel,
    source,
    className,
    fullPage = false,
    hideSummary = false,
}: RequestProductCTAProps) {
    const t = useT();
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [pendingRequest, setPendingRequest] = useState<ProductAccessRequestRow | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadPendingRequest = async () => {
            try {
                const rows = await getAdminProductAccessRequests({ productCode });
                if (cancelled) return;
                const match = rows.find((row) => row.tierCode === tierCode && row.status === "PENDING") ?? null;
                setPendingRequest(match);
            } catch {
                // Silent by design. The CTA can still submit directly.
            }
        };

        void loadPendingRequest();

        return () => {
            cancelled = true;
        };
    }, [productCode, tierCode]);

    const requestLabel = useMemo(() => getRequestLabel(ctaLabel), [ctaLabel]);
    const localizedCtaLabel = useMemo(
        () => t("entitlements.requestProduct", { productName: requestLabel }),
        [requestLabel, t],
    );
    const isPending = pendingRequest?.status === "PENDING";
    const isDisabled = loading || submitted || isPending;

    const handleSubmit = async () => {
        if (isDisabled) return;

        setLoading(true);
        try {
            const result = await createAdminProductAccessRequest({
                productCode,
                tierCode,
                capability,
                message,
                source,
            });

            setPendingRequest(result.request);
            setSubmitted(true);
            setMessage("");
            await notify.success(t("productAccessRequest.success"));
        } catch (error) {
            const typedError = error as Error & {
                status?: number;
                data?: { request?: ProductAccessRequestRow };
            };

            if (typedError.status === 409 && typedError.data?.request) {
                setPendingRequest(typedError.data.request);
                await notify.info(t("productAccessRequest.pending"));
            } else {
                await notify.error(
                    error instanceof Error ? error.message : t("productAccessRequest.submitError"),
                );
            }
        } finally {
            setLoading(false);
        }
    };

    if (fullPage) {
        return (
            <div className={cn("mx-auto max-w-xl py-12 text-center", className)}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                    {submitted || isPending ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    ) : (
                        <Lock className="h-7 w-7 text-amber-600" />
                    )}
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-amber-600">
                    {requestLabel}
                </p>
                <h3 className="mt-3 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>

                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700">
                    <Sparkles className="mb-0.5 mr-1.5 inline-block h-4 w-4 shrink-0 text-amber-500" />
                    {t("productAccessRequest.requires", { productName: requestLabel })}
                </p>

                {submitted ? (
                    <p className="mt-5 text-sm font-medium text-emerald-700">
                        {t("productAccessRequest.success")}
                    </p>
                ) : isPending ? (
                    <p className="mt-5 text-sm font-medium text-amber-700">
                        {t("productAccessRequest.pending")}
                    </p>
                ) : (
                    <div className="mt-6 space-y-3 text-left">
                        <label className="block text-sm text-slate-600">
                            {t("productAccessRequest.optionalMessage")}
                        </label>
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value.slice(0, 500))}
                            placeholder={t("productAccessRequest.messagePlaceholder")}
                            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20"
                        />
                        <Button onClick={() => void handleSubmit()} disabled={isDisabled} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {localizedCtaLabel}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn("rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950", className)}>
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-3">
                    {!hideSummary ? (
                        <div>
                            <p className="text-sm font-semibold">{title}</p>
                            <p className="mt-1 text-sm">{description}</p>
                            <p className="mt-2 text-xs leading-relaxed text-amber-800/80">
                                {t("productAccessRequest.requires", { productName: requestLabel })}
                            </p>
                        </div>
                    ) : null}

                    {submitted ? (
                        <p className="text-sm font-medium text-emerald-700">
                            {t("productAccessRequest.success")}
                        </p>
                    ) : isPending ? (
                        <p className="text-sm font-medium text-amber-800">
                            {t("productAccessRequest.pending")}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
                                    {t("productAccessRequest.optionalMessage")}
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value.slice(0, 500))}
                                    placeholder={t("productAccessRequest.messagePlaceholder")}
                                    className="min-h-20 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-admin-brand focus:ring-2 focus:ring-admin-brand/20"
                                />
                            </div>
                            <Button onClick={() => void handleSubmit()} disabled={isDisabled} size="sm">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {localizedCtaLabel}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
