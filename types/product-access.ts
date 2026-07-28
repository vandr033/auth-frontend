export type ProductCode =
    | "RESERVAS"
    | "EVENTOS"
    | "CLASES"
    | "STORES"
    | "RESTAURANTE"
    | "PERSONALIZACION"
    | "CRM"
    | "MENSAJERIA"
    | "METRICAS"
    | "MARKETPLACE";

export type ProductTierCode =
    | "RESERVAS_BASE"
    | "RESERVAS_PRO"
    | "EVENTOS_BASE"
    | "EVENTOS_PRO"
    | "CLASES_BASE"
    | "CLASES_PRO"
    | "STORES_BASE"
    | "STORES_PRO"
    | "RESTAURANTE_PRO"
    | "PERSONALIZACION_BASE"
    | "PERSONALIZACION_PLUS"
    | "CRM_BASE"
    | "CRM_PRO"
    | "MENSAJERIA_BASE"
    | "MENSAJERIA_PRO"
    | "METRICAS_BASE"
    | "METRICAS_PRO"
    | "MARKETPLACE_PLUS";

export type ProductCapability =
    | "RESERVAS_BASE"
    | "RESERVAS_PRO"
    | "RESERVAS_SERVICE_PROMOTIONS"
    | "EVENTOS_BASE"
    | "EVENTOS_PRO"
    | "CLASES_BASE"
    | "CLASES_PRO"
    | "RESTAURANT_MODULE"
    | "COMMERCE_ACCESS"
    | "COMMERCE_PRODUCTS"
    | "COMMERCE_CATEGORIES"
    | "COMMERCE_STOCK"
    | "COMMERCE_ORDERS"
    | "COMMERCE_PICKUP"
    | "COMMERCE_DELIVERY"
    | "COMMERCE_SCHEDULED_ORDERS"
    | "COMMERCE_COMBOS"
    | "COMMERCE_PROMOTIONS"
    | "COMMERCE_STAFF_ASSIGNMENT"
    | "COMMERCE_METRICS"
    | "CRM_BASE"
    | "CRM_PRO"
    | "CRM_IMPORT_EXPORT"
    | "CRM_SEGMENTATION"
    | "CRM_REACTIVATION"
    | "MENSAJERIA_BASE"
    | "MENSAJERIA_PRO"
    | "MENSAJERIA_REMINDERS"
    | "MENSAJERIA_BULK_WHATSAPP"
    | "MENSAJERIA_REVIEW_REQUESTS"
    | "MENSAJERIA_CAMPAIGNS"
    | "PERSONALIZACION_BASE"
    | "PERSONALIZACION_PLUS"
    | "STOREFRONT_ADVANCED_CTA"
    | "STOREFRONT_SECTION_ORDER"
    | "STOREFRONT_FOOTER_CUSTOMIZATION"
    | "STOREFRONT_ANNOUNCEMENT_BANNERS"
    | "METRICAS_BASE"
    | "METRICAS_PRO"
    | "METRICAS_OPERATIONAL_DASHBOARD"
    | "METRICAS_GROUP_ANALYTICS"
    | "METRICAS_REVIEW_ANALYTICS"
    | "MARKETPLACE_LISTING"
    | "MARKETPLACE_PLUS";

export type ProductAccessRequestStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";

export type ProductAccessRequestSource =
    | "ADMIN_LOCKED_PAGE"
    | "API_403"
    | "SETTINGS_LOCKED_CONTROL"
    | "SIDEBAR_LOCKED_ITEM"
    | "PUBLIC_PRICING"
    | "SUPER_ADMIN_MANUAL";

export interface EffectiveCompanyProduct {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    status: "ACTIVE" | "TRIALING" | "EXPIRED" | "CANCELLED" | "SUSPENDED";
    isCore: boolean;
    includedByDefault: boolean;
}

export interface ProductAccessRecommendation {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    capability: ProductCapability;
    productName: string;
    tierName: string;
    requestLabel: string;
    ctaLabel: string;
    title: string;
    description: string;
    requiresLabel: string;
}

export interface ProductAccessRequestRow {
    id: number;
    companyId: number;
    productCode: ProductCode;
    tierCode: ProductTierCode;
    capability: ProductCapability;
    status: ProductAccessRequestStatus;
    message: string | null;
    source: ProductAccessRequestSource;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    internalNote: string | null;
    company: {
        id: number;
        name: string;
        slug: string;
    } | null;
    requestedByUser: {
        id: string;
        email: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
    } | null;
    resolvedByUser: {
        id: string;
        email: string;
        name: string | null;
        firstName: string | null;
        lastName: string | null;
    } | null;
    recommendation: ProductAccessRecommendation;
}
