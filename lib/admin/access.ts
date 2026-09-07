import type { CompanyCapabilities, PlanFeatureKey } from "@/lib/plans/capabilities";
import type { ProductCapability, ProductCode, ProductTierCode } from "@/types/product-access";

export type EffectiveCompanyAccessMode = "FULL" | "READ_ONLY" | "RENEWAL_ONLY" | "BLOCKED";

export type EffectiveCompanyAccess = {
    version: 1;
    companyId: number;
    lifecycle: {
        mode: EffectiveCompanyAccessMode;
        isActive: boolean;
        isExpired: boolean;
        availableUntil: string | null;
        reason: "COMPANY_INACTIVE" | "COMPANY_DELETED" | "COMPANY_EXPIRED" | null;
    };
    membership: {
        id: number | null;
        role: "OWNER" | "ADMIN" | "STAFF" | "CUSTOMER" | null;
    };
    restaurant: {
        activeShiftId: number | null;
        activeShiftRole: "MANAGER" | "HOST" | "WAITER" | null;
    };
    entitlements: CompanyCapabilities;
    configuredProducts: Array<{
        id: number | null;
        productCode: ProductCode;
        tierCode: ProductTierCode;
        status: "ACTIVE" | "TRIALING" | "EXPIRED" | "CANCELLED" | "SUSPENDED";
        isCore: boolean;
        includedByDefault: boolean;
        startsAt: string | null;
        availableUntil: string | null;
        cancelledAt: string | null;
        effective: boolean;
        reason:
            | "EFFECTIVE"
            | "LEGACY_FALLBACK"
            | "FUTURE"
            | "EXPIRED"
            | "STATUS_INACTIVE"
            | "CANCELLED"
            | "CATALOG_INACTIVE";
    }>;
};

export function hasEffectiveCapability(
    access: EffectiveCompanyAccess | null | undefined,
    capability: ProductCapability,
): boolean {
    return access?.entitlements.productCapabilities?.[capability] === true;
}

export function hasEffectiveFeature(
    access: EffectiveCompanyAccess | null | undefined,
    feature: PlanFeatureKey,
): boolean {
    return access?.entitlements.features?.[feature] === true;
}

export function hasEffectiveProduct(
    access: EffectiveCompanyAccess | null | undefined,
    productCode: ProductCode,
): boolean {
    return access?.entitlements.products?.some((product) => product.productCode === productCode) ?? false;
}

export function hasEffectiveTier(
    access: EffectiveCompanyAccess | null | undefined,
    tierCode: ProductTierCode,
): boolean {
    return access?.entitlements.products?.some((product) => product.tierCode === tierCode) ?? false;
}

export function canOperateCompany(access: EffectiveCompanyAccess | null | undefined): boolean {
    return access?.lifecycle.mode === "FULL";
}

export type AdminRouteAccessReason =
    | "COMPANY_ACCESS_DENIED"
    | "COMPANY_EXPIRED"
    | "ROLE_FORBIDDEN"
    | "FEATURE_NOT_ENTITLED";

export type AdminRouteAccessResult = {
    allowed: boolean;
    reason?: AdminRouteAccessReason;
    requiredFeature?: PlanFeatureKey;
    requiredCapability?: ProductCapability;
};

type AdminRouteRequirement = {
    prefix: string;
    exact?: boolean;
    roles?: Array<"OWNER" | "ADMIN" | "STAFF">;
    feature?: PlanFeatureKey;
    anyFeatures?: PlanFeatureKey[];
    capability?: ProductCapability;
    allowRenewalOnly?: boolean;
};

function routeMatches(prefix: string, path: string, exact = false): boolean {
    return exact ? path === prefix : path === prefix || path.startsWith(`${prefix}/`);
}

const ACCOUNT_ROUTES: AdminRouteRequirement[] = [
    { prefix: "/admin/dashboard/billing", exact: true, roles: ["OWNER", "ADMIN"], allowRenewalOnly: true },
    { prefix: "/admin/dashboard/profile", exact: true, roles: ["OWNER", "ADMIN", "STAFF"], allowRenewalOnly: true },
];

const ADMIN_ROUTE_REQUIREMENTS: AdminRouteRequirement[] = [
    { prefix: "/admin/dashboard/services", roles: ["OWNER", "ADMIN"], capability: "RESERVAS_BASE" },
    { prefix: "/admin/dashboard/bookings", roles: ["OWNER", "ADMIN", "STAFF"], capability: "RESERVAS_BASE" },
    { prefix: "/admin/dashboard/availability", roles: ["OWNER", "ADMIN", "STAFF"], feature: "STAFF_AVAILABILITY" },
    { prefix: "/admin/dashboard/time-off", roles: ["OWNER", "ADMIN", "STAFF"], feature: "STAFF_AVAILABILITY" },
    { prefix: "/admin/dashboard/permissions", roles: ["OWNER", "ADMIN"], feature: "ROLES_PERMISSIONS" },
    { prefix: "/admin/dashboard/settings", exact: true, roles: ["OWNER", "ADMIN"], capability: "RESERVAS_BASE" },
    { prefix: "/admin/dashboard/group-reservations/events", roles: ["OWNER", "ADMIN"], feature: "GROUP_EVENTS" },
    { prefix: "/admin/dashboard/group-reservations/classes", roles: ["OWNER", "ADMIN"], feature: "GROUP_CLASSES" },
    {
        prefix: "/admin/dashboard/group-reservations/attendance",
        roles: ["OWNER", "ADMIN"],
        anyFeatures: ["GROUP_EVENTS", "GROUP_CLASSES"],
    },
    {
        prefix: "/admin/dashboard/group-reservations/metrics",
        roles: ["OWNER", "ADMIN"],
        anyFeatures: ["GROUP_EVENTS", "GROUP_CLASSES"],
    },
    {
        prefix: "/admin/dashboard/group-reservations/payments",
        roles: ["OWNER", "ADMIN"],
        anyFeatures: ["GROUP_EVENTS", "GROUP_CLASSES"],
    },
    {
        prefix: "/admin/dashboard/group-reservations",
        roles: ["OWNER", "ADMIN"],
        anyFeatures: ["GROUP_EVENTS", "GROUP_CLASSES"],
    },
    { prefix: "/admin/dashboard/customers/communications", roles: ["OWNER", "ADMIN"], capability: "MENSAJERIA_PRO" },
    { prefix: "/admin/dashboard/customers/import-export", roles: ["OWNER", "ADMIN"], capability: "CRM_PRO" },
    { prefix: "/admin/dashboard/customers", roles: ["OWNER", "ADMIN"], capability: "CRM_BASE" },
    { prefix: "/admin/dashboard/reviews", roles: ["OWNER", "ADMIN", "STAFF"], feature: "REVIEW_MANAGEMENT" },
    { prefix: "/admin/dashboard/store/settings", roles: ["OWNER", "ADMIN"], capability: "COMMERCE_ACCESS" },
    { prefix: "/admin/dashboard/store/products", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_PRODUCTS" },
    { prefix: "/admin/dashboard/store/categories", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_CATEGORIES" },
    { prefix: "/admin/dashboard/store/combos", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_COMBOS" },
    { prefix: "/admin/dashboard/store/points-of-sale", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_ACCESS" },
    { prefix: "/admin/dashboard/store/orders", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_ORDERS" },
    { prefix: "/admin/dashboard/store", roles: ["OWNER", "ADMIN", "STAFF"], capability: "COMMERCE_ACCESS" },
    { prefix: "/admin/dashboard/restaurant", roles: ["OWNER", "ADMIN"], capability: "RESTAURANT_MODULE" },
    { prefix: "/admin/dashboard/storefront", roles: ["OWNER", "ADMIN"], capability: "PERSONALIZACION_BASE" },
    { prefix: "/admin/dashboard/storefront-builder", roles: ["OWNER", "ADMIN"], capability: "PERSONALIZACION_BASE" },
    { prefix: "/admin/dashboard/theme", roles: ["OWNER", "ADMIN"], capability: "PERSONALIZACION_BASE" },
    { prefix: "/admin/dashboard/page-management", roles: ["OWNER", "ADMIN"], capability: "PERSONALIZACION_BASE" },
    { prefix: "/admin/dashboard/staff", roles: ["OWNER", "ADMIN"] },
    { prefix: "/admin/dashboard/business-settings", roles: ["OWNER", "ADMIN"] },
    { prefix: "/admin/dashboard/schedule", roles: ["OWNER", "ADMIN"] },
    { prefix: "/admin/dashboard/hours", roles: ["OWNER", "ADMIN"] },
    { prefix: "/admin/dashboard/modules", roles: ["OWNER", "ADMIN"] },
];

function requirementForPath(path: string): AdminRouteRequirement | null {
    const accountRoute = ACCOUNT_ROUTES.find((requirement) =>
        routeMatches(requirement.prefix, path, requirement.exact),
    );
    if (accountRoute) return accountRoute;

    return ADMIN_ROUTE_REQUIREMENTS.find((requirement) =>
        routeMatches(requirement.prefix, path, requirement.exact),
    ) ?? null;
}

export function getAdminRouteAccess(
    path: string,
    access: EffectiveCompanyAccess | null | undefined,
): AdminRouteAccessResult {
    if (!access || access.lifecycle.mode === "BLOCKED") {
        return { allowed: false, reason: "COMPANY_ACCESS_DENIED" };
    }

    const requirement = requirementForPath(path);
    if (access.lifecycle.mode === "RENEWAL_ONLY" && !requirement?.allowRenewalOnly) {
        return { allowed: false, reason: "COMPANY_EXPIRED" };
    }
    if (access.lifecycle.mode === "READ_ONLY") {
        return { allowed: false, reason: "COMPANY_ACCESS_DENIED" };
    }

    const role = access.membership.role;
    if (requirement?.roles && (!role || !requirement.roles.includes(role as "OWNER" | "ADMIN" | "STAFF"))) {
        return { allowed: false, reason: "ROLE_FORBIDDEN" };
    }

    if (requirement?.capability && !hasEffectiveCapability(access, requirement.capability)) {
        return {
            allowed: false,
            reason: "FEATURE_NOT_ENTITLED",
            requiredCapability: requirement.capability,
        };
    }

    if (requirement?.feature && !hasEffectiveFeature(access, requirement.feature)) {
        return {
            allowed: false,
            reason: "FEATURE_NOT_ENTITLED",
            requiredFeature: requirement.feature,
        };
    }

    if (
        requirement?.anyFeatures &&
        !requirement.anyFeatures.some((feature) => hasEffectiveFeature(access, feature))
    ) {
        return {
            allowed: false,
            reason: "FEATURE_NOT_ENTITLED",
            requiredFeature: requirement.anyFeatures[0],
        };
    }

    return { allowed: true };
}
