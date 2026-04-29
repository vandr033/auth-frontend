import type { CompanyCapabilities } from "@/lib/plans/capabilities";
import type { ProductCapability, ProductCode, ProductTierCode } from "@/types/product-access";
import { getAdminNavigationCatalog } from "./navigation";

type NavigationFixture = {
    id: string;
    entitlements: CompanyCapabilities;
    expectedStates: Partial<Record<string, "active" | "locked" | "hidden">>;
};

const ALL_PRODUCT_CAPABILITIES: ProductCapability[] = [
    "RESERVAS_BASE",
    "RESERVAS_PRO",
    "EVENTOS_BASE",
    "EVENTOS_PRO",
    "CLASES_BASE",
    "CLASES_PRO",
    "CRM_BASE",
    "CRM_PRO",
    "CRM_IMPORT_EXPORT",
    "CRM_SEGMENTATION",
    "CRM_REACTIVATION",
    "MENSAJERIA_BASE",
    "MENSAJERIA_PRO",
    "MENSAJERIA_REMINDERS",
    "MENSAJERIA_BULK_WHATSAPP",
    "MENSAJERIA_REVIEW_REQUESTS",
    "MENSAJERIA_CAMPAIGNS",
    "PERSONALIZACION_BASE",
    "PERSONALIZACION_PLUS",
    "STOREFRONT_ADVANCED_CTA",
    "STOREFRONT_SECTION_ORDER",
    "STOREFRONT_FOOTER_CUSTOMIZATION",
    "STOREFRONT_ANNOUNCEMENT_BANNERS",
    "METRICAS_BASE",
    "METRICAS_PRO",
    "METRICAS_OPERATIONAL_DASHBOARD",
    "METRICAS_GROUP_ANALYTICS",
    "METRICAS_REVIEW_ANALYTICS",
];

function getProductCodeFromTier(tierCode: ProductTierCode): ProductCode {
    if (tierCode.startsWith("RESERVAS")) return "RESERVAS";
    if (tierCode.startsWith("EVENTOS")) return "EVENTOS";
    if (tierCode.startsWith("CLASES")) return "CLASES";
    if (tierCode.startsWith("CRM")) return "CRM";
    if (tierCode.startsWith("MENSAJERIA")) return "MENSAJERIA";
    if (tierCode.startsWith("METRICAS")) return "METRICAS";
    if (tierCode.startsWith("MARKETPLACE")) return "MARKETPLACE";
    return "PERSONALIZACION";
}

function buildEntitlements(
    currentPlan: CompanyCapabilities["currentPlan"],
    tierCodes: ProductTierCode[],
    capabilityCodes: ProductCapability[] = [],
): CompanyCapabilities {
    const capabilitySet = new Set<ProductCapability>(capabilityCodes);
    const products = tierCodes.map((tierCode) => ({
        tierCode,
        productCode: getProductCodeFromTier(tierCode),
        status: "ACTIVE" as const,
        isCore:
            tierCode.startsWith("RESERVAS") ||
            tierCode.startsWith("EVENTOS") ||
            tierCode.startsWith("CLASES"),
        includedByDefault:
            tierCode === "CRM_BASE" ||
            tierCode === "MENSAJERIA_BASE" ||
            tierCode === "PERSONALIZACION_BASE",
    }));

    return {
        version: 1,
        currentPlan,
        maxStaffMembers: currentPlan === "PRO" ? null : currentPlan === "BUSINESS" ? 10 : 3,
        features: {} as CompanyCapabilities["features"],
        requiredPlans: {} as CompanyCapabilities["requiredPlans"],
        source: "modular",
        productCapabilities: ALL_PRODUCT_CAPABILITIES.reduce((acc, capability) => {
            acc[capability] = capabilitySet.has(capability);
            return acc;
        }, {} as Record<ProductCapability, boolean>),
        products,
        activeCoreProducts: tierCodes.filter((tier) =>
            tier.startsWith("RESERVAS") || tier.startsWith("EVENTOS") || tier.startsWith("CLASES"),
        ),
        activeAddOns: tierCodes.filter((tier) =>
            !tier.startsWith("RESERVAS") && !tier.startsWith("EVENTOS") && !tier.startsWith("CLASES"),
        ),
    };
}

export const ADMIN_NAVIGATION_FIXTURES: NavigationFixture[] = [
    {
        id: "reservas-base",
        entitlements: buildEntitlements("STARTER", [
            "RESERVAS_BASE",
            "CRM_BASE",
            "MENSAJERIA_BASE",
            "PERSONALIZACION_BASE",
        ], [
            "RESERVAS_BASE",
            "CRM_BASE",
            "MENSAJERIA_BASE",
            "PERSONALIZACION_BASE",
        ]),
        expectedStates: {
            bookings: "active",
            services: "active",
            availability: "active",
            events: "locked",
            classes: "locked",
            "crm-pro": "locked",
            "messaging-pro": "locked",
            "metrics-pro": "locked",
            "customization-plus": "locked",
        },
    },
    {
        id: "reservas-pro",
        entitlements: buildEntitlements("BUSINESS", [
            "RESERVAS_PRO",
            "CRM_BASE",
            "MENSAJERIA_BASE",
            "PERSONALIZACION_BASE",
        ], [
            "RESERVAS_BASE",
            "RESERVAS_PRO",
            "CRM_BASE",
            "MENSAJERIA_BASE",
            "PERSONALIZACION_BASE",
        ]),
        expectedStates: {
            bookings: "active",
            availability: "active",
            events: "locked",
            classes: "locked",
        },
    },
    {
        id: "eventos-base",
        entitlements: buildEntitlements("BUSINESS", ["EVENTOS_BASE"], ["EVENTOS_BASE"]),
        expectedStates: {
            bookings: "hidden",
            events: "active",
            classes: "locked",
            customers: "active",
            storefront: "active",
        },
    },
    {
        id: "eventos-pro",
        entitlements: buildEntitlements("PRO", ["EVENTOS_PRO"], ["EVENTOS_BASE", "EVENTOS_PRO"]),
        expectedStates: {
            events: "active",
            classes: "locked",
            staff: "active",
            hours: "active",
        },
    },
    {
        id: "clases-pro",
        entitlements: buildEntitlements("PRO", ["CLASES_PRO"], ["CLASES_BASE", "CLASES_PRO"]),
        expectedStates: {
            events: "locked",
            classes: "active",
            hours: "active",
            staff: "active",
        },
    },
    {
        id: "all-addons",
        entitlements: buildEntitlements("PRO", [
            "RESERVAS_PRO",
            "EVENTOS_PRO",
            "CLASES_PRO",
            "CRM_PRO",
            "MENSAJERIA_PRO",
            "METRICAS_PRO",
            "PERSONALIZACION_PLUS",
        ], [
            "RESERVAS_BASE",
            "RESERVAS_PRO",
            "EVENTOS_BASE",
            "EVENTOS_PRO",
            "CLASES_BASE",
            "CLASES_PRO",
            "CRM_BASE",
            "CRM_PRO",
            "CRM_IMPORT_EXPORT",
            "CRM_SEGMENTATION",
            "CRM_REACTIVATION",
            "MENSAJERIA_BASE",
            "MENSAJERIA_PRO",
            "MENSAJERIA_REMINDERS",
            "MENSAJERIA_BULK_WHATSAPP",
            "MENSAJERIA_REVIEW_REQUESTS",
            "MENSAJERIA_CAMPAIGNS",
            "METRICAS_BASE",
            "METRICAS_PRO",
            "METRICAS_OPERATIONAL_DASHBOARD",
            "METRICAS_GROUP_ANALYTICS",
            "METRICAS_REVIEW_ANALYTICS",
            "PERSONALIZACION_BASE",
            "PERSONALIZACION_PLUS",
            "STOREFRONT_ADVANCED_CTA",
            "STOREFRONT_SECTION_ORDER",
            "STOREFRONT_FOOTER_CUSTOMIZATION",
            "STOREFRONT_ANNOUNCEMENT_BANNERS",
        ]),
        expectedStates: {
            events: "active",
            classes: "active",
            "crm-pro": "active",
            "messaging-pro": "active",
            "metrics-pro": "active",
            "customization-plus": "active",
        },
    },
    {
        id: "legacy-business-fallback",
        entitlements: {
            ...buildEntitlements("BUSINESS", [
                "RESERVAS_PRO",
                "EVENTOS_BASE",
                "CRM_BASE",
                "MENSAJERIA_BASE",
                "METRICAS_BASE",
                "PERSONALIZACION_BASE",
            ], [
                "RESERVAS_BASE",
                "RESERVAS_PRO",
                "EVENTOS_BASE",
                "CRM_BASE",
                "CRM_IMPORT_EXPORT",
                "MENSAJERIA_BASE",
                "MENSAJERIA_REMINDERS",
                "METRICAS_BASE",
                "METRICAS_OPERATIONAL_DASHBOARD",
                "METRICAS_REVIEW_ANALYTICS",
                "PERSONALIZACION_BASE",
                "STOREFRONT_SECTION_ORDER",
                "STOREFRONT_FOOTER_CUSTOMIZATION",
            ]),
            source: "legacy_plan",
        },
        expectedStates: {
            bookings: "active",
            events: "active",
            classes: "locked",
            "crm-pro": "locked",
            "messaging-pro": "locked",
            "metrics-pro": "locked",
            "customization-plus": "locked",
        },
    },
];

export const ADMIN_NAVIGATION_FIXTURE_SUMMARIES = ADMIN_NAVIGATION_FIXTURES.map((fixture) => ({
    id: fixture.id,
    items: getAdminNavigationCatalog(fixture.entitlements).map((item) => ({
        id: item.id,
        state: item.state,
    })),
}));
