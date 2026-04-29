"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { BillingCycle, ProductCode, ProductTierCode } from "@/types/super-admin";
import {
    ADD_ON_DEFINITIONS,
    CORE_PRODUCT_DEFINITIONS,
    deriveLegacyPlanCompatibility,
    formatTierCode,
    getIncludedCapabilityLabels,
    getSelectedProductLabels,
    type ProductConfigFormState,
    type ProductFormSelection,
} from "../lib/product-config";

type ProductConfigurationSectionProps = {
    billingCycle: BillingCycle;
    currency: string;
    availableUntil: string;
    value: ProductConfigFormState;
    onChange: (nextValue: ProductConfigFormState) => void;
    priceOverride: string;
    showLegacyMetricsBase?: boolean;
    validationError?: string | null;
};

function updateSelection(
    value: ProductConfigFormState,
    productCode: ProductCode,
    nextSelection: Partial<ProductFormSelection>,
): ProductConfigFormState {
    return {
        ...value,
        [productCode]: {
            ...value[productCode],
            ...nextSelection,
        },
    };
}

function ProductCard(props: {
    title: string;
    description: string;
    productCode: ProductCode;
    value: ProductConfigFormState;
    onChange: (nextValue: ProductConfigFormState) => void;
    billingCycle: BillingCycle;
    currency: string;
    availableUntil: string;
    activeOptions: Array<{ tierCode: ProductTierCode; label: string }>;
    allowLegacyBase?: boolean;
    defaultIncludedLabel?: string;
    comingSoon?: boolean;
}) {
    const selection = props.value[props.productCode];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{props.title}</p>
                        {props.comingSoon ? (
                            <Badge className="bg-slate-100 text-slate-700">Coming soon</Badge>
                        ) : null}
                    </div>
                    <p className="text-sm text-slate-500">{props.description}</p>
                    {props.defaultIncludedLabel ? (
                        <p className="text-xs text-slate-500">{props.defaultIncludedLabel}</p>
                    ) : null}
                </div>
                <div className="w-40">
                    <Label className="text-xs text-slate-500">State</Label>
                    <Select
                        value={selection.state}
                        onValueChange={(nextState) => {
                            if (props.comingSoon) return;
                            props.onChange(
                                updateSelection(props.value, props.productCode, {
                                    state: nextState as ProductFormSelection["state"],
                                    billingCycle: selection.billingCycle || props.billingCycle,
                                    availableUntil: selection.availableUntil || props.availableUntil,
                                    currency: selection.currency || props.currency,
                                }),
                            );
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="REQUESTED">Requested</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selection.state !== "INACTIVE" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Tier</Label>
                        <Select
                            value={selection.tierCode}
                            onValueChange={(tierCode) =>
                                props.onChange(
                                    updateSelection(props.value, props.productCode, {
                                        tierCode: tierCode as ProductTierCode,
                                    }),
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {props.activeOptions
                                    .filter((option) => props.allowLegacyBase || option.tierCode !== "METRICAS_BASE")
                                    .map((option) => (
                                        <SelectItem key={option.tierCode} value={option.tierCode}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selection.state === "ACTIVE" ? (
                        <>
                            <div className="space-y-2">
                                <Label>Billing cycle</Label>
                                <Select
                                    value={selection.billingCycle}
                                    onValueChange={(billingCycle) =>
                                        props.onChange(
                                            updateSelection(props.value, props.productCode, {
                                                billingCycle: billingCycle as BillingCycle,
                                            }),
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                                        <SelectItem value="YEARLY">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Available until</Label>
                                <Input
                                    type="datetime-local"
                                    value={selection.availableUntil}
                                    onChange={(event) =>
                                        props.onChange(
                                            updateSelection(props.value, props.productCode, {
                                                availableUntil: event.target.value,
                                            }),
                                        )
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Input
                                    value={selection.currency}
                                    maxLength={3}
                                    onChange={(event) =>
                                        props.onChange(
                                            updateSelection(props.value, props.productCode, {
                                                currency: event.target.value.slice(0, 3),
                                            }),
                                        )
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Product price</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={selection.pricePaid}
                                    onChange={(event) =>
                                        props.onChange(
                                            updateSelection(props.value, props.productCode, {
                                                pricePaid: event.target.value,
                                            }),
                                        )
                                    }
                                    placeholder="Uses company price if empty"
                                />
                            </div>
                        </>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export function ProductConfigurationSection(props: ProductConfigurationSectionProps) {
    const activeProductLabels = getSelectedProductLabels(props.value, "ACTIVE");
    const requestedProductLabels = getSelectedProductLabels(props.value, "REQUESTED");
    const includedCapabilities = getIncludedCapabilityLabels(props.value);
    const legacyPlanCompatibility = deriveLegacyPlanCompatibility(props.value);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Product configuration</CardTitle>
                <CardDescription>
                    Configure the active modular products first. Legacy plan remains as a compatibility field only.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Core products</h3>
                        <p className="text-sm text-slate-500">At least one active core product is required.</p>
                    </div>
                    <div className="grid gap-4">
                        {CORE_PRODUCT_DEFINITIONS.map((product) => (
                            <ProductCard
                                key={product.productCode}
                                title={product.title}
                                description={product.description}
                                productCode={product.productCode}
                                value={props.value}
                                onChange={props.onChange}
                                billingCycle={props.billingCycle}
                                currency={props.currency}
                                availableUntil={props.availableUntil}
                                activeOptions={product.activeTierOptions}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add-ons</h3>
                        <p className="text-sm text-slate-500">
                            CRM Base, Personalizacion Base, and Mensajeria Base are included by default.
                        </p>
                    </div>
                    <div className="grid gap-4">
                        {ADD_ON_DEFINITIONS.map((product) => (
                            <ProductCard
                                key={product.productCode}
                                title={product.title}
                                description={product.description}
                                productCode={product.productCode}
                                value={props.value}
                                onChange={props.onChange}
                                billingCycle={props.billingCycle}
                                currency={props.currency}
                                availableUntil={props.availableUntil}
                                activeOptions={product.activeTierOptions}
                                defaultIncludedLabel={product.defaultIncludedLabel}
                                comingSoon={product.comingSoon}
                                allowLegacyBase={
                                    product.productCode === "METRICAS" &&
                                    (props.showLegacyMetricsBase || props.value.METRICAS.tierCode === "METRICAS_BASE")
                                }
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-emerald-900">Calculated summary</h3>
                        {props.validationError ? (
                            <Badge className="bg-rose-100 text-rose-700">{props.validationError}</Badge>
                        ) : null}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Active products</p>
                            <p className="mt-1 text-sm text-emerald-900">
                                {activeProductLabels.length > 0 ? activeProductLabels.join(", ") : "None yet"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Requested products</p>
                            <p className="mt-1 text-sm text-emerald-900">
                                {requestedProductLabels.length > 0 ? requestedProductLabels.join(", ") : "None"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Included capabilities</p>
                            <p className="mt-1 text-sm text-emerald-900">{includedCapabilities.join(", ")}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Estimated monthly price</p>
                            <p className="mt-1 text-sm text-emerald-900">
                                {props.priceOverride.trim()
                                    ? `${props.currency} ${props.priceOverride} (manual override)`
                                    : "No modular pricing constants configured yet"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Legacy plan compatibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{legacyPlanCompatibility}</p>
                    <p className="mt-1 text-xs text-slate-500">
                        This is a best-effort compatibility value only. Modular products remain the source of truth.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Advanced / debug</p>
                    <p className="mt-2 text-sm text-slate-600">
                        Current active tiers: {activeProductLabels.length > 0 ? activeProductLabels.join(", ") : "None"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Requested tiers: {requestedProductLabels.length > 0 ? requestedProductLabels.join(", ") : "None"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Compatibility plan: {legacyPlanCompatibility}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export function formatProductHistoryValue(value: unknown): string {
    if (!value || typeof value !== "object") return "—";

    const maybeRecord = value as { tierName?: string; productName?: string; requestedProducts?: Array<{ tierName?: string }> };
    if (maybeRecord.productName && maybeRecord.tierName) {
        return `${maybeRecord.productName} • ${maybeRecord.tierName}`;
    }
    if (Array.isArray(maybeRecord.requestedProducts)) {
        return maybeRecord.requestedProducts.map((product) => product.tierName).filter(Boolean).join(", ") || "—";
    }

    if ("tierCode" in maybeRecord && typeof maybeRecord.tierCode === "string") {
        return formatTierCode(maybeRecord.tierCode as ProductTierCode);
    }

    return "—";
}
