import type {
    ActiveCommercialProduct,
    BillingCycle,
    ProductCode,
    ProductTierCode,
    RequestedCommercialProduct,
    RequestedProductPayload,
    CommercialProductPayload,
    ShopPlan,
} from "@/types/super-admin";

export type ProductSelectionState = "INACTIVE" | "ACTIVE" | "REQUESTED";

export type ProductFormSelection = {
    state: ProductSelectionState;
    tierCode: ProductTierCode;
    billingCycle: BillingCycle;
    availableUntil: string;
    pricePaid: string;
    currency: string;
    comingSoon?: boolean;
    legacyBaseEnabled?: boolean;
};

export type ProductConfigFormState = Record<ProductCode, ProductFormSelection>;

export type ProductCardDefinition = {
    productCode: ProductCode;
    title: string;
    description: string;
    kind: "core" | "addon";
    defaultTierCode: ProductTierCode;
    activeTierOptions: Array<{
        tierCode: ProductTierCode;
        label: string;
    }>;
    requestTierOptions?: Array<{
        tierCode: ProductTierCode;
        label: string;
    }>;
    defaultIncludedLabel?: string;
    comingSoon?: boolean;
};

const DEFAULT_CURRENCY = "Bs.";

export const CORE_PRODUCT_DEFINITIONS: ProductCardDefinition[] = [
    {
        productCode: "RESERVAS",
        title: "Reservas",
        description: "1:1 bookings, services, staff, and appointment operations.",
        kind: "core",
        defaultTierCode: "RESERVAS_BASE",
        activeTierOptions: [
            { tierCode: "RESERVAS_BASE", label: "Base" },
            { tierCode: "RESERVAS_PRO", label: "Pro" },
        ],
    },
    {
        productCode: "EVENTOS",
        title: "Eventos",
        description: "Paid and free events with registrations and attendance flows.",
        kind: "core",
        defaultTierCode: "EVENTOS_BASE",
        activeTierOptions: [
            { tierCode: "EVENTOS_BASE", label: "Base" },
            { tierCode: "EVENTOS_PRO", label: "Pro" },
        ],
    },
    {
        productCode: "CLASES",
        title: "Clases",
        description: "Recurring classes, sessions, enrollments, and attendance.",
        kind: "core",
        defaultTierCode: "CLASES_BASE",
        activeTierOptions: [
            { tierCode: "CLASES_BASE", label: "Base" },
            { tierCode: "CLASES_PRO", label: "Pro" },
        ],
    },
];

export const ADD_ON_DEFINITIONS: ProductCardDefinition[] = [
    {
        productCode: "PERSONALIZACION",
        title: "Personalizacion Plus",
        description: "Advanced storefront CTA, layout, footer, and announcement controls.",
        kind: "addon",
        defaultTierCode: "PERSONALIZACION_PLUS",
        activeTierOptions: [{ tierCode: "PERSONALIZACION_PLUS", label: "Plus" }],
        defaultIncludedLabel: "Personalizacion Base included by default",
    },
    {
        productCode: "CRM",
        title: "CRM Pro",
        description: "Segmentation, import/export, and reactivation tooling.",
        kind: "addon",
        defaultTierCode: "CRM_PRO",
        activeTierOptions: [{ tierCode: "CRM_PRO", label: "Pro" }],
        defaultIncludedLabel: "CRM Base included by default",
    },
    {
        productCode: "MENSAJERIA",
        title: "Mensajeria Pro",
        description: "Reminders, campaigns, review requests, and bulk outreach.",
        kind: "addon",
        defaultTierCode: "MENSAJERIA_PRO",
        activeTierOptions: [{ tierCode: "MENSAJERIA_PRO", label: "Pro" }],
        defaultIncludedLabel: "Mensajeria Base included by default",
    },
    {
        productCode: "METRICAS",
        title: "Metricas",
        description: "Dashboards and analytics for operations and reviews.",
        kind: "addon",
        defaultTierCode: "METRICAS_PRO",
        activeTierOptions: [
            { tierCode: "METRICAS_PRO", label: "Pro" },
            { tierCode: "METRICAS_BASE", label: "Legacy Base" },
        ],
    },
    {
        productCode: "MARKETPLACE",
        title: "Marketplace Plus",
        description: "Premium discovery and placement. Coming soon.",
        kind: "addon",
        defaultTierCode: "MARKETPLACE_PLUS",
        activeTierOptions: [{ tierCode: "MARKETPLACE_PLUS", label: "Coming soon" }],
        comingSoon: true,
    },
];

export const PRODUCT_DEFINITIONS = [...CORE_PRODUCT_DEFINITIONS, ...ADD_ON_DEFINITIONS];

export function createEmptyProductConfig(params: {
    billingCycle: BillingCycle;
    availableUntil: string;
    currency: string;
}): ProductConfigFormState {
    return PRODUCT_DEFINITIONS.reduce((acc, product) => {
        acc[product.productCode] = {
            state: "INACTIVE",
            tierCode: product.defaultTierCode,
            billingCycle: params.billingCycle,
            availableUntil: params.availableUntil,
            pricePaid: "",
            currency: params.currency || DEFAULT_CURRENCY,
            comingSoon: product.comingSoon,
            legacyBaseEnabled: false,
        };
        return acc;
    }, {} as ProductConfigFormState);
}

export function hydrateProductConfig(params: {
    billingCycle: BillingCycle;
    availableUntil: string;
    currency: string;
    activeProducts?: ActiveCommercialProduct[];
    requestedProducts?: RequestedCommercialProduct[];
}): ProductConfigFormState {
    const state = createEmptyProductConfig({
        billingCycle: params.billingCycle,
        availableUntil: params.availableUntil,
        currency: params.currency,
    });

    for (const product of params.activeProducts ?? []) {
        if (product.includedByDefault) continue;
        state[product.productCode] = {
            state: "ACTIVE",
            tierCode: product.tierCode,
            billingCycle: product.billingCycle,
            availableUntil: product.availableUntil.slice(0, 16),
            pricePaid: product.pricePaid ?? "",
            currency: product.currency || params.currency,
            comingSoon: product.productCode === "MARKETPLACE",
            legacyBaseEnabled: product.tierCode === "METRICAS_BASE",
        };
    }

    for (const product of params.requestedProducts ?? []) {
        state[product.productCode] = {
            ...state[product.productCode],
            state: "REQUESTED",
            tierCode: product.tierCode,
        };
    }

    return state;
}

export function withCompanyDefaults(
    state: ProductConfigFormState,
    params: {
        billingCycle: BillingCycle;
        availableUntil: string;
        currency: string;
    },
): ProductConfigFormState {
    const nextState = { ...state };
    for (const productCode of Object.keys(nextState) as ProductCode[]) {
        const current = nextState[productCode];
        nextState[productCode] = {
            ...current,
            billingCycle: current.billingCycle || params.billingCycle,
            availableUntil: current.availableUntil || params.availableUntil,
            currency: current.currency || params.currency || DEFAULT_CURRENCY,
        };
    }
    return nextState;
}

export function buildCommercialPayload(state: ProductConfigFormState): {
    activeProducts: CommercialProductPayload[];
    requestedProducts: RequestedProductPayload[];
} {
    const activeProducts: CommercialProductPayload[] = [];
    const requestedProducts: RequestedProductPayload[] = [];

    for (const productCode of Object.keys(state) as ProductCode[]) {
        const product = state[productCode];
        if (product.comingSoon) continue;

        if (product.state === "ACTIVE") {
            activeProducts.push({
                productCode,
                tierCode: product.tierCode,
                billingCycle: product.billingCycle,
                availableUntil: product.availableUntil ? new Date(product.availableUntil).toISOString() : null,
                pricePaid: product.pricePaid.trim() ? Number(product.pricePaid) : null,
                currency: product.currency.trim() || DEFAULT_CURRENCY,
            });
        }

        if (product.state === "REQUESTED") {
            requestedProducts.push({
                productCode,
                tierCode: product.tierCode,
            });
        }
    }

    return {
        activeProducts,
        requestedProducts,
    };
}

export function getActiveCoreCount(state: ProductConfigFormState): number {
    return CORE_PRODUCT_DEFINITIONS.filter(
        (product) => state[product.productCode]?.state === "ACTIVE",
    ).length;
}

export function getIncludedCapabilityLabels(state: ProductConfigFormState): string[] {
    const labels = [
        "CRM Base",
        "Personalizacion Base",
        "Mensajeria Base",
    ];

    for (const product of PRODUCT_DEFINITIONS) {
        const selection = state[product.productCode];
        if (selection.state !== "ACTIVE") continue;
        if (product.kind === "addon" && selection.tierCode === "METRICAS_BASE") {
            labels.push("Metricas Base");
            continue;
        }
        labels.push(formatTierCode(selection.tierCode));
    }

    return Array.from(new Set(labels));
}

export function getSelectedProductLabels(state: ProductConfigFormState, matchState: ProductSelectionState): string[] {
    return PRODUCT_DEFINITIONS
        .filter((product) => state[product.productCode]?.state === matchState)
        .map((product) => formatTierCode(state[product.productCode].tierCode));
}

export function deriveLegacyPlanCompatibility(state: ProductConfigFormState): ShopPlan {
    const selectedTiers = new Set(
        PRODUCT_DEFINITIONS
            .filter((product) => state[product.productCode]?.state === "ACTIVE")
            .map((product) => state[product.productCode].tierCode),
    );

    if (
        selectedTiers.has("CLASES_BASE") ||
        selectedTiers.has("CLASES_PRO") ||
        selectedTiers.has("EVENTOS_PRO") ||
        ["CRM_PRO", "MENSAJERIA_PRO", "PERSONALIZACION_PLUS", "METRICAS_PRO", "MARKETPLACE_PLUS"].filter(
            (tierCode) => selectedTiers.has(tierCode as ProductTierCode),
        ).length >= 2
    ) {
        return "PRO";
    }

    if (selectedTiers.size === 1 && selectedTiers.has("RESERVAS_BASE")) {
        return "STARTER";
    }

    if (
        selectedTiers.has("RESERVAS_PRO") ||
        selectedTiers.has("EVENTOS_BASE") ||
        selectedTiers.has("CRM_PRO") ||
        selectedTiers.has("MENSAJERIA_PRO") ||
        selectedTiers.has("PERSONALIZACION_PLUS") ||
        selectedTiers.has("METRICAS_PRO")
    ) {
        return "BUSINESS";
    }

    return "STARTER";
}

export function formatTierCode(tierCode: ProductTierCode): string {
    return tierCode
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
