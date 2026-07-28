import type { PlanFeatureKey } from "@/lib/plans/capabilities";
import type { CompanyCapabilities } from "@/lib/plans/capabilities";
import type {
    ProductAccessRecommendation,
    ProductCapability,
    ProductCode,
    ProductTierCode,
} from "@/types/product-access";

type ProductAccessDefinition = {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    capability: ProductCapability;
};

const REQUEST_LABELS: Record<ProductTierCode, string> = {
    RESERVAS_BASE: "Reservas",
    RESERVAS_PRO: "Reservas Pro",
    EVENTOS_BASE: "Eventos",
    EVENTOS_PRO: "Eventos Pro",
    CLASES_BASE: "Clases",
    CLASES_PRO: "Clases Pro",
    STORES_BASE: "Tienda",
    STORES_PRO: "Tienda Pro",
    RESTAURANTE_PRO: "Restaurante",
    PERSONALIZACION_BASE: "Personalización Base",
    PERSONALIZACION_PLUS: "Personalización Pro",
    CRM_BASE: "CRM",
    CRM_PRO: "CRM Pro",
    MENSAJERIA_BASE: "Mensajería Base",
    MENSAJERIA_PRO: "Mensajería Pro",
    METRICAS_BASE: "Métricas Base",
    METRICAS_PRO: "Métricas",
    MARKETPLACE_PLUS: "Marketplace Plus",
};

const FEATURE_ACCESS: Record<PlanFeatureKey, ProductAccessDefinition> = {
    ROLES_PERMISSIONS: { productCode: "RESERVAS", tierCode: "RESERVAS_PRO", capability: "RESERVAS_PRO" },
    STAFF_AVAILABILITY: { productCode: "RESERVAS", tierCode: "RESERVAS_PRO", capability: "RESERVAS_PRO" },
    TRANSACTIONAL_BOOKING_NOTIFICATIONS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_BASE", capability: "MENSAJERIA_BASE" },
    BOOKING_REMINDERS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REMINDERS" },
    CUSTOMER_IMPORT_EXPORT: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_IMPORT_EXPORT" },
    OPERATIONAL_DASHBOARD: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_OPERATIONAL_DASHBOARD" },
    REVIEW_MANAGEMENT: { productCode: "RESERVAS", tierCode: "RESERVAS_BASE", capability: "RESERVAS_BASE" },
    REVIEW_ANALYTICS: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_REVIEW_ANALYTICS" },
    REVIEW_REQUEST_REMINDERS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REVIEW_REQUESTS" },
    REVIEW_REQUEST_EMAIL: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REVIEW_REQUESTS" },
    REVIEW_REQUEST_WHATSAPP: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REVIEW_REQUESTS" },
    BOOKING_FLOW_CUSTOMIZATION: { productCode: "RESERVAS", tierCode: "RESERVAS_PRO", capability: "RESERVAS_PRO" },
    HOME_CTA_CUSTOMIZATION: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_ADVANCED_CTA" },
    HOME_SECTION_ORDER: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_SECTION_ORDER" },
    FOOTER_CUSTOMIZATION: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_FOOTER_CUSTOMIZATION" },
    ANNOUNCEMENT_BANNERS: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_ANNOUNCEMENT_BANNERS" },
    BULK_WHATSAPP_MESSAGING: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_BULK_WHATSAPP" },
    BULK_EMAIL_CAMPAIGNS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_CAMPAIGNS" },
    OUTREACH_REACTIVATION_TOOLS: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_REACTIVATION" },
    GROUP_EVENTS: { productCode: "EVENTOS", tierCode: "EVENTOS_BASE", capability: "EVENTOS_BASE" },
    GROUP_CLASSES: { productCode: "CLASES", tierCode: "CLASES_BASE", capability: "CLASES_BASE" },
    GROUP_ADVANCED: { productCode: "EVENTOS", tierCode: "EVENTOS_PRO", capability: "EVENTOS_PRO" },
    RESTAURANT_MODULE: { productCode: "RESTAURANTE", tierCode: "RESTAURANTE_PRO", capability: "RESTAURANT_MODULE" },
};

const CAPABILITY_ACCESS: Record<ProductCapability, ProductAccessDefinition> = {
    RESERVAS_BASE: { productCode: "RESERVAS", tierCode: "RESERVAS_BASE", capability: "RESERVAS_BASE" },
    RESERVAS_PRO: { productCode: "RESERVAS", tierCode: "RESERVAS_PRO", capability: "RESERVAS_PRO" },
    RESERVAS_SERVICE_PROMOTIONS: { productCode: "RESERVAS", tierCode: "RESERVAS_PRO", capability: "RESERVAS_SERVICE_PROMOTIONS" },
    EVENTOS_BASE: { productCode: "EVENTOS", tierCode: "EVENTOS_BASE", capability: "EVENTOS_BASE" },
    EVENTOS_PRO: { productCode: "EVENTOS", tierCode: "EVENTOS_PRO", capability: "EVENTOS_PRO" },
    CLASES_BASE: { productCode: "CLASES", tierCode: "CLASES_BASE", capability: "CLASES_BASE" },
    CLASES_PRO: { productCode: "CLASES", tierCode: "CLASES_PRO", capability: "CLASES_PRO" },
    RESTAURANT_MODULE: { productCode: "RESTAURANTE", tierCode: "RESTAURANTE_PRO", capability: "RESTAURANT_MODULE" },
    COMMERCE_ACCESS: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_ACCESS" },
    COMMERCE_PRODUCTS: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_PRODUCTS" },
    COMMERCE_CATEGORIES: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_CATEGORIES" },
    COMMERCE_STOCK: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_STOCK" },
    COMMERCE_ORDERS: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_ORDERS" },
    COMMERCE_PICKUP: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_PICKUP" },
    COMMERCE_DELIVERY: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_DELIVERY" },
    COMMERCE_COMBOS: { productCode: "STORES", tierCode: "STORES_BASE", capability: "COMMERCE_COMBOS" },
    COMMERCE_SCHEDULED_ORDERS: { productCode: "STORES", tierCode: "STORES_PRO", capability: "COMMERCE_SCHEDULED_ORDERS" },
    COMMERCE_PROMOTIONS: { productCode: "STORES", tierCode: "STORES_PRO", capability: "COMMERCE_PROMOTIONS" },
    COMMERCE_STAFF_ASSIGNMENT: { productCode: "STORES", tierCode: "STORES_PRO", capability: "COMMERCE_STAFF_ASSIGNMENT" },
    COMMERCE_METRICS: { productCode: "STORES", tierCode: "STORES_PRO", capability: "COMMERCE_METRICS" },
    CRM_BASE: { productCode: "CRM", tierCode: "CRM_BASE", capability: "CRM_BASE" },
    CRM_PRO: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_PRO" },
    CRM_IMPORT_EXPORT: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_IMPORT_EXPORT" },
    CRM_SEGMENTATION: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_SEGMENTATION" },
    CRM_REACTIVATION: { productCode: "CRM", tierCode: "CRM_PRO", capability: "CRM_REACTIVATION" },
    MENSAJERIA_BASE: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_BASE", capability: "MENSAJERIA_BASE" },
    MENSAJERIA_PRO: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_PRO" },
    MENSAJERIA_REMINDERS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REMINDERS" },
    MENSAJERIA_BULK_WHATSAPP: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_BULK_WHATSAPP" },
    MENSAJERIA_REVIEW_REQUESTS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_REVIEW_REQUESTS" },
    MENSAJERIA_CAMPAIGNS: { productCode: "MENSAJERIA", tierCode: "MENSAJERIA_PRO", capability: "MENSAJERIA_CAMPAIGNS" },
    PERSONALIZACION_BASE: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_BASE", capability: "PERSONALIZACION_BASE" },
    PERSONALIZACION_PLUS: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "PERSONALIZACION_PLUS" },
    STOREFRONT_ADVANCED_CTA: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_ADVANCED_CTA" },
    STOREFRONT_SECTION_ORDER: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_SECTION_ORDER" },
    STOREFRONT_FOOTER_CUSTOMIZATION: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_FOOTER_CUSTOMIZATION" },
    STOREFRONT_ANNOUNCEMENT_BANNERS: { productCode: "PERSONALIZACION", tierCode: "PERSONALIZACION_PLUS", capability: "STOREFRONT_ANNOUNCEMENT_BANNERS" },
    METRICAS_BASE: { productCode: "METRICAS", tierCode: "METRICAS_BASE", capability: "METRICAS_BASE" },
    METRICAS_PRO: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_PRO" },
    METRICAS_OPERATIONAL_DASHBOARD: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_OPERATIONAL_DASHBOARD" },
    METRICAS_GROUP_ANALYTICS: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_GROUP_ANALYTICS" },
    METRICAS_REVIEW_ANALYTICS: { productCode: "METRICAS", tierCode: "METRICAS_PRO", capability: "METRICAS_REVIEW_ANALYTICS" },
    MARKETPLACE_LISTING: { productCode: "MARKETPLACE", tierCode: "MARKETPLACE_PLUS", capability: "MARKETPLACE_LISTING" },
    MARKETPLACE_PLUS: { productCode: "MARKETPLACE", tierCode: "MARKETPLACE_PLUS", capability: "MARKETPLACE_PLUS" },
};

export function hasProductTier(
    capabilities: CompanyCapabilities | null | undefined,
    tierCode: ProductTierCode,
): boolean {
    return (
        capabilities?.products?.some(
            (product) =>
                product.tierCode === tierCode &&
                (product.status === "ACTIVE" || product.status === "TRIALING"),
        ) ?? false
    );
}

export function hasProductCapability(
    capabilities: CompanyCapabilities | null | undefined,
    capability: ProductCapability,
): boolean {
    return capabilities?.productCapabilities?.[capability] === true;
}

function buildRecommendation(definition: ProductAccessDefinition): ProductAccessRecommendation {
    const requestLabel = REQUEST_LABELS[definition.tierCode];
    return {
        ...definition,
        productName: requestLabel,
        tierName: requestLabel,
        requestLabel,
        ctaLabel: `Solicitar ${requestLabel}`,
        title: "Este módulo no está activo para tu empresa.",
        description: `Solicitá activar ${requestLabel} y nuestro equipo va a revisar tu pedido.`,
        requiresLabel: `Requiere ${requestLabel}`,
    };
}

export function getProductAccessRecommendationForFeature(
    feature: PlanFeatureKey,
    capabilities?: CompanyCapabilities | null,
): ProductAccessRecommendation {
    if (feature === "GROUP_ADVANCED") {
        if (hasProductTier(capabilities, "EVENTOS_BASE") && !hasProductTier(capabilities, "EVENTOS_PRO")) {
            return buildRecommendation({
                productCode: "EVENTOS",
                tierCode: "EVENTOS_PRO",
                capability: "EVENTOS_PRO",
            });
        }

        if (hasProductTier(capabilities, "CLASES_BASE") && !hasProductTier(capabilities, "CLASES_PRO")) {
            return buildRecommendation({
                productCode: "CLASES",
                tierCode: "CLASES_PRO",
                capability: "CLASES_PRO",
            });
        }
    }

    return buildRecommendation(FEATURE_ACCESS[feature]);
}

export function getProductAccessRecommendationForCapability(
    capability: ProductCapability,
): ProductAccessRecommendation {
    return buildRecommendation(CAPABILITY_ACCESS[capability]);
}
