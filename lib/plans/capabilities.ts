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
    | "BULK_WHATSAPP_MESSAGING"
    | "BULK_EMAIL_CAMPAIGNS"
    | "OUTREACH_REACTIVATION_TOOLS";

export type PlanCapabilities = {
    maxStaffMembers: number | null;
    features: Record<PlanFeatureKey, boolean>;
};

export const PLAN_CAPABILITIES: Record<ShopPlan, PlanCapabilities> = {
    STARTER: {
        maxStaffMembers: 3,
        features: {
            ROLES_PERMISSIONS: false,
            STAFF_AVAILABILITY: false,
            TRANSACTIONAL_BOOKING_NOTIFICATIONS: false,
            BOOKING_REMINDERS: false,
            CUSTOMER_IMPORT_EXPORT: false,
            OPERATIONAL_DASHBOARD: false,
            REVIEW_MANAGEMENT: false,
            REVIEW_ANALYTICS: false,
            REVIEW_REQUEST_REMINDERS: false,
            REVIEW_REQUEST_EMAIL: false,
            REVIEW_REQUEST_WHATSAPP: false,
            BULK_WHATSAPP_MESSAGING: false,
            BULK_EMAIL_CAMPAIGNS: false,
            OUTREACH_REACTIVATION_TOOLS: false,
        },
    },
    BUSINESS: {
        maxStaffMembers: 10,
        features: {
            ROLES_PERMISSIONS: true,
            STAFF_AVAILABILITY: true,
            TRANSACTIONAL_BOOKING_NOTIFICATIONS: true,
            BOOKING_REMINDERS: true,
            CUSTOMER_IMPORT_EXPORT: true,
            OPERATIONAL_DASHBOARD: true,
            REVIEW_MANAGEMENT: true,
            REVIEW_ANALYTICS: true,
            REVIEW_REQUEST_REMINDERS: true,
            REVIEW_REQUEST_EMAIL: true,
            REVIEW_REQUEST_WHATSAPP: false,
            BULK_WHATSAPP_MESSAGING: false,
            BULK_EMAIL_CAMPAIGNS: false,
            OUTREACH_REACTIVATION_TOOLS: false,
        },
    },
    PRO: {
        maxStaffMembers: null,
        features: {
            ROLES_PERMISSIONS: true,
            STAFF_AVAILABILITY: true,
            TRANSACTIONAL_BOOKING_NOTIFICATIONS: true,
            BOOKING_REMINDERS: true,
            CUSTOMER_IMPORT_EXPORT: true,
            OPERATIONAL_DASHBOARD: true,
            REVIEW_MANAGEMENT: true,
            REVIEW_ANALYTICS: true,
            REVIEW_REQUEST_REMINDERS: true,
            REVIEW_REQUEST_EMAIL: true,
            REVIEW_REQUEST_WHATSAPP: true,
            BULK_WHATSAPP_MESSAGING: true,
            BULK_EMAIL_CAMPAIGNS: true,
            OUTREACH_REACTIVATION_TOOLS: true,
        },
    },
};

export const FEATURE_REQUIRED_PLAN: Record<PlanFeatureKey, ShopPlan> = {
    ROLES_PERMISSIONS: "BUSINESS",
    STAFF_AVAILABILITY: "BUSINESS",
    TRANSACTIONAL_BOOKING_NOTIFICATIONS: "BUSINESS",
    BOOKING_REMINDERS: "BUSINESS",
    CUSTOMER_IMPORT_EXPORT: "BUSINESS",
    OPERATIONAL_DASHBOARD: "BUSINESS",
    REVIEW_MANAGEMENT: "BUSINESS",
    REVIEW_ANALYTICS: "BUSINESS",
    REVIEW_REQUEST_REMINDERS: "BUSINESS",
    REVIEW_REQUEST_EMAIL: "BUSINESS",
    REVIEW_REQUEST_WHATSAPP: "PRO",
    BULK_WHATSAPP_MESSAGING: "PRO",
    BULK_EMAIL_CAMPAIGNS: "PRO",
    OUTREACH_REACTIVATION_TOOLS: "PRO",
};

export function resolveShopPlan(plan?: string | null): ShopPlan {
    if (plan === "STARTER" || plan === "BUSINESS" || plan === "PRO") {
        return plan;
    }

    return "BUSINESS";
}

export function getPlanCapabilities(plan: ShopPlan): PlanCapabilities {
    return PLAN_CAPABILITIES[plan];
}

export function canUsePlanFeature(plan: ShopPlan, feature: PlanFeatureKey): boolean {
    return PLAN_CAPABILITIES[plan].features[feature] === true;
}

export function getRequiredPlanForFeature(feature: PlanFeatureKey): ShopPlan {
    return FEATURE_REQUIRED_PLAN[feature];
}

export function getStaffLimitForPlan(plan: ShopPlan): number | null {
    return PLAN_CAPABILITIES[plan].maxStaffMembers;
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
    REVIEW_REQUEST_REMINDERS: "planEnforcement.desc.reviewRequestReminders",
    REVIEW_REQUEST_EMAIL: "planEnforcement.desc.reviewRequestEmail",
    REVIEW_REQUEST_WHATSAPP: "planEnforcement.desc.reviewRequestWhatsapp",
    BULK_WHATSAPP_MESSAGING: "planEnforcement.desc.bulkWhatsapp",
    BULK_EMAIL_CAMPAIGNS: "planEnforcement.desc.bulkEmail",
    OUTREACH_REACTIVATION_TOOLS: "planEnforcement.desc.outreachReactivation",
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
    REVIEW_REQUEST_REMINDERS: "planEnforcement.label.reviewRequestReminders",
    REVIEW_REQUEST_EMAIL: "planEnforcement.label.reviewRequestEmail",
    REVIEW_REQUEST_WHATSAPP: "planEnforcement.label.reviewRequestWhatsapp",
    BULK_WHATSAPP_MESSAGING: "planEnforcement.label.bulkWhatsapp",
    BULK_EMAIL_CAMPAIGNS: "planEnforcement.label.bulkEmail",
    OUTREACH_REACTIVATION_TOOLS: "planEnforcement.label.outreachReactivation",
};
