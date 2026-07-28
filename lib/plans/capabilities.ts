import type {
    EffectiveCompanyProduct,
    ProductCapability,
} from "@/types/product-access";

export type ShopPlan = "STARTER" | "BUSINESS" | "PRO";

export type PlanFeatureKey =
    | "ROLES_PERMISSIONS"
    | "STAFF_AVAILABILITY"
    | "TRANSACTIONAL_BOOKING_NOTIFICATIONS"
    | "BOOKING_REMINDERS"
    | "CUSTOMER_IMPORT_EXPORT"
    | "OPERATIONAL_DASHBOARD"
    | "REVIEW_MANAGEMENT"
    | "REVIEW_ANALYTICS"
    | "REVIEW_REQUEST_REMINDERS"
    | "REVIEW_REQUEST_EMAIL"
    | "REVIEW_REQUEST_WHATSAPP"
    | "BOOKING_FLOW_CUSTOMIZATION"
    | "HOME_CTA_CUSTOMIZATION"
    | "HOME_SECTION_ORDER"
    | "FOOTER_CUSTOMIZATION"
    | "ANNOUNCEMENT_BANNERS"
    | "BULK_WHATSAPP_MESSAGING"
    | "BULK_EMAIL_CAMPAIGNS"
    | "OUTREACH_REACTIVATION_TOOLS"
    | "GROUP_EVENTS"
    | "GROUP_CLASSES"
    | "GROUP_ADVANCED"
    | "RESTAURANT_MODULE";

export type CompanyCapabilities = {
    version: 1;
    currentPlan: ShopPlan;
    maxStaffMembers: number | null;
    features: Record<PlanFeatureKey, boolean>;
    requiredPlans: Record<PlanFeatureKey, ShopPlan>;
    source?: "legacy_plan" | "modular";
    productCapabilities?: Partial<Record<ProductCapability, boolean>>;
    products?: EffectiveCompanyProduct[];
    activeCoreProducts?: string[];
    activeAddOns?: string[];
};

type CapabilityCarrier = {
    capabilities?: CompanyCapabilities | null;
    plan?: string | null;
} | null | undefined;

export function resolveShopPlan(plan?: string | null): ShopPlan {
    if (plan === "STARTER" || plan === "BUSINESS" || plan === "PRO") {
        return plan;
    }

    return "BUSINESS";
}

export function getCompanyCapabilities(source: CapabilityCarrier | CompanyCapabilities): CompanyCapabilities | null {
    if (!source) return null;

    if ("currentPlan" in source && "features" in source && "requiredPlans" in source) {
        return source;
    }

    return source.capabilities ?? null;
}

export function getCurrentPlan(source?: CapabilityCarrier | CompanyCapabilities): ShopPlan {
    const capabilities = getCompanyCapabilities(source ?? null);
    if (capabilities?.currentPlan) {
        return capabilities.currentPlan;
    }

    if (source && "plan" in source) {
        return resolveShopPlan(source.plan);
    }

    return "BUSINESS";
}

export function canUsePlanFeature(
    source: CapabilityCarrier | CompanyCapabilities,
    feature: PlanFeatureKey,
): boolean {
    return getCompanyCapabilities(source)?.features?.[feature] === true;
}

const FEATURE_CAPABILITY_MAP: Partial<Record<PlanFeatureKey, ProductCapability>> = {
    ROLES_PERMISSIONS: "RESERVAS_PRO",
    STAFF_AVAILABILITY: "RESERVAS_PRO",
    TRANSACTIONAL_BOOKING_NOTIFICATIONS: "MENSAJERIA_BASE",
    BOOKING_REMINDERS: "MENSAJERIA_REMINDERS",
    CUSTOMER_IMPORT_EXPORT: "CRM_IMPORT_EXPORT",
    OPERATIONAL_DASHBOARD: "METRICAS_OPERATIONAL_DASHBOARD",
    REVIEW_MANAGEMENT: "RESERVAS_BASE",
    REVIEW_ANALYTICS: "METRICAS_REVIEW_ANALYTICS",
    REVIEW_REQUEST_REMINDERS: "MENSAJERIA_REVIEW_REQUESTS",
    REVIEW_REQUEST_EMAIL: "MENSAJERIA_REVIEW_REQUESTS",
    REVIEW_REQUEST_WHATSAPP: "MENSAJERIA_REVIEW_REQUESTS",
    BOOKING_FLOW_CUSTOMIZATION: "RESERVAS_PRO",
    HOME_CTA_CUSTOMIZATION: "STOREFRONT_ADVANCED_CTA",
    HOME_SECTION_ORDER: "STOREFRONT_SECTION_ORDER",
    FOOTER_CUSTOMIZATION: "STOREFRONT_FOOTER_CUSTOMIZATION",
    ANNOUNCEMENT_BANNERS: "STOREFRONT_ANNOUNCEMENT_BANNERS",
    BULK_WHATSAPP_MESSAGING: "MENSAJERIA_BULK_WHATSAPP",
    BULK_EMAIL_CAMPAIGNS: "MENSAJERIA_CAMPAIGNS",
    OUTREACH_REACTIVATION_TOOLS: "CRM_REACTIVATION",
    GROUP_EVENTS: "EVENTOS_BASE",
    GROUP_CLASSES: "CLASES_BASE",
    GROUP_ADVANCED: "EVENTOS_PRO",
    RESTAURANT_MODULE: "RESTAURANT_MODULE",
};

const FEATURE_CAPABILITY_ANY_OF: Partial<Record<PlanFeatureKey, ProductCapability[]>> = {
    GROUP_ADVANCED: ["EVENTOS_PRO", "CLASES_PRO"],
};

export function canUseEntitledFeature(
    source: CapabilityCarrier | CompanyCapabilities,
    feature: PlanFeatureKey,
): boolean {
    const capabilities = getCompanyCapabilities(source);
    const mappedCapability = FEATURE_CAPABILITY_MAP[feature];
    const anyOfCapabilities = FEATURE_CAPABILITY_ANY_OF[feature];
    const productCapabilities = capabilities?.productCapabilities;

    if (productCapabilities && Object.keys(productCapabilities).length > 0) {
        if (anyOfCapabilities && anyOfCapabilities.length > 0) {
            return anyOfCapabilities.some((capability) => productCapabilities[capability] === true);
        }

        if (mappedCapability) {
            return productCapabilities[mappedCapability] === true;
        }
    }

    return capabilities?.features?.[feature] === true;
}

export function getRequiredPlanForFeature(
    source: CapabilityCarrier | CompanyCapabilities,
    feature: PlanFeatureKey,
): ShopPlan {
    return getCompanyCapabilities(source)?.requiredPlans?.[feature] ?? "BUSINESS";
}

export function getStaffLimitForPlan(source: CapabilityCarrier | CompanyCapabilities): number | null {
    return getCompanyCapabilities(source)?.maxStaffMembers ?? null;
}

/**
 * i18n key that describes what a locked feature does, so users understand
 * what they're missing.
 */
export const FEATURE_DESCRIPTION_KEY: Record<PlanFeatureKey, string> = {
    ROLES_PERMISSIONS: "planEnforcement.desc.rolesPermissions",
    STAFF_AVAILABILITY: "planEnforcement.desc.staffAvailability",
    TRANSACTIONAL_BOOKING_NOTIFICATIONS: "planEnforcement.desc.bookingNotifications",
    BOOKING_REMINDERS: "planEnforcement.desc.bookingReminders",
    CUSTOMER_IMPORT_EXPORT: "planEnforcement.desc.customerImportExport",
    OPERATIONAL_DASHBOARD: "planEnforcement.desc.operationalDashboard",
    REVIEW_MANAGEMENT: "planEnforcement.desc.reviewManagement",
    REVIEW_ANALYTICS: "planEnforcement.desc.reviewAnalytics",
    BOOKING_FLOW_CUSTOMIZATION: "planEnforcement.desc.bookingFlowCustomization",
    HOME_CTA_CUSTOMIZATION: "planEnforcement.desc.homeCTACustomization",
    HOME_SECTION_ORDER: "planEnforcement.desc.homeSectionOrder",
    FOOTER_CUSTOMIZATION: "planEnforcement.desc.footerCustomization",
    ANNOUNCEMENT_BANNERS: "planEnforcement.desc.announcementBanners",
    REVIEW_REQUEST_REMINDERS: "planEnforcement.desc.reviewRequestReminders",
    REVIEW_REQUEST_EMAIL: "planEnforcement.desc.reviewRequestEmail",
    REVIEW_REQUEST_WHATSAPP: "planEnforcement.desc.reviewRequestWhatsapp",
    BULK_WHATSAPP_MESSAGING: "planEnforcement.desc.bulkWhatsapp",
    BULK_EMAIL_CAMPAIGNS: "planEnforcement.desc.bulkEmail",
    OUTREACH_REACTIVATION_TOOLS: "planEnforcement.desc.outreachReactivation",
    GROUP_EVENTS: "planEnforcement.desc.groupEvents",
    GROUP_CLASSES: "planEnforcement.desc.groupClasses",
    GROUP_ADVANCED: "planEnforcement.desc.groupAdvanced",
    RESTAURANT_MODULE: "planEnforcement.desc.restaurantModule",
};

/**
 * i18n key for the human-readable feature name.
 */
export const FEATURE_LABEL_KEY: Record<PlanFeatureKey, string> = {
    ROLES_PERMISSIONS: "planEnforcement.label.rolesPermissions",
    STAFF_AVAILABILITY: "planEnforcement.label.staffAvailability",
    TRANSACTIONAL_BOOKING_NOTIFICATIONS: "planEnforcement.label.bookingNotifications",
    BOOKING_REMINDERS: "planEnforcement.label.bookingReminders",
    CUSTOMER_IMPORT_EXPORT: "planEnforcement.label.customerImportExport",
    OPERATIONAL_DASHBOARD: "planEnforcement.label.operationalDashboard",
    REVIEW_MANAGEMENT: "planEnforcement.label.reviewManagement",
    REVIEW_ANALYTICS: "planEnforcement.label.reviewAnalytics",
    BOOKING_FLOW_CUSTOMIZATION: "planEnforcement.label.bookingFlowCustomization",
    HOME_CTA_CUSTOMIZATION: "planEnforcement.label.homeCTACustomization",
    HOME_SECTION_ORDER: "planEnforcement.label.homeSectionOrder",
    FOOTER_CUSTOMIZATION: "planEnforcement.label.footerCustomization",
    ANNOUNCEMENT_BANNERS: "planEnforcement.label.announcementBanners",
    REVIEW_REQUEST_REMINDERS: "planEnforcement.label.reviewRequestReminders",
    REVIEW_REQUEST_EMAIL: "planEnforcement.label.reviewRequestEmail",
    REVIEW_REQUEST_WHATSAPP: "planEnforcement.label.reviewRequestWhatsapp",
    BULK_WHATSAPP_MESSAGING: "planEnforcement.label.bulkWhatsapp",
    BULK_EMAIL_CAMPAIGNS: "planEnforcement.label.bulkEmail",
    OUTREACH_REACTIVATION_TOOLS: "planEnforcement.label.outreachReactivation",
    GROUP_EVENTS: "planEnforcement.label.groupEvents",
    GROUP_CLASSES: "planEnforcement.label.groupClasses",
    GROUP_ADVANCED: "planEnforcement.label.groupAdvanced",
    RESTAURANT_MODULE: "planEnforcement.label.restaurantModule",
};
