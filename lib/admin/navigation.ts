import { canUseEntitledFeature, type CompanyCapabilities, type PlanFeatureKey } from "@/lib/plans/capabilities";
import {
    hasEffectiveCapability,
    hasEffectiveProduct,
    hasEffectiveTier,
    type EffectiveCompanyAccess,
} from "@/lib/admin/access";
import { getProductAccessRecommendationForFeature } from "@/lib/product-access";
import type { ProductAccessRecommendation, ProductCode, ProductTierCode } from "@/types/product-access";

export type AdminNavigationRole = "OWNER" | "ADMIN" | "STAFF";

export type AdminNavigationState = "active" | "locked" | "hidden";

export type AdminNavigationGroupId =
    | "overview"
    | "products"
    | "customers"
    | "storefront"
    | "operations";

export type AdminNavigationIconKey =
    | "dashboard"
    | "bookings"
    | "services"
    | "availability"
    | "timeOff"
    | "settings"
    | "events"
    | "classes"
    | "customers"
    | "crm"
    | "messaging"
    | "metrics"
    | "storefront"
    | "customization"
    | "hours"
    | "staff"
    | "profile"
    | "restaurant";

export type AdminNavigationItemId =
    | "dashboard"
    | "bookings"
    | "store"
    | "services"
    | "availability"
    | "time-off"
    | "booking-settings"
    | "events"
    | "classes"
    | "customers"
    | "crm-pro"
    | "messaging-pro"
    | "metrics-pro"
    | "storefront"
    | "customization-plus"
    | "hours"
    | "staff"
    | "business-settings"
    | "billing"
    | "profile"
    | "restaurant";

export type AdminNavigationChildItem = {
    id: string;
    labelKey: string;
    href: string;
    exact?: boolean;
    activePrefixes?: string[];
    roles?: AdminNavigationRole[];
};

export type AdminModulePageLink = {
    href: string;
    labelKey: string;
    descriptionKey: string;
    hidden?: boolean;
};

export type AdminModulePageModel = {
    id: AdminNavigationItemId;
    state: Extract<AdminNavigationState, "active" | "locked">;
    titleKey: string;
    descriptionKey: string;
    featureKeys: string[];
    recommendation: ProductAccessRecommendation | null;
    links: AdminModulePageLink[];
};

export type AdminNavigationItem = {
    id: AdminNavigationItemId;
    groupId: AdminNavigationGroupId;
    labelKey: string;
    href: string;
    iconKey: AdminNavigationIconKey;
    roles: AdminNavigationRole[];
    state: AdminNavigationState;
    exact?: boolean;
    activePrefixes: string[];
    children?: AdminNavigationChildItem[];
    recommendationFeature?: PlanFeatureKey;
    moduleRoute?: string;
};

export type AdminNavigationGroup = {
    id: AdminNavigationGroupId;
    labelKey: string;
    items: AdminNavigationItem[];
};

type VisibilityContext = {
    access: EffectiveCompanyAccess | null;
    entitlements: CompanyCapabilities | null | undefined;
    hasAnyCoreProduct: boolean;
    isStoreOnlyCompany: boolean;
    hasReservas: boolean;
    hasStores: boolean;
    hasEventos: boolean;
    hasClases: boolean;
    hasReservasPro: boolean;
    hasEventosPro: boolean;
    hasClasesPro: boolean;
    hasCrmPro: boolean;
    hasMessagingPro: boolean;
    hasMetricsPro: boolean;
    hasCustomizationPlus: boolean;
    hasRestaurant: boolean;
};

type AdminNavigationDefinition = {
    id: AdminNavigationItemId;
    groupId: AdminNavigationGroupId;
    labelKey: string;
    href: string;
    iconKey: AdminNavigationIconKey;
    roles: AdminNavigationRole[];
    exact?: boolean;
    activePrefixes?: string[];
    children?: AdminNavigationChildItem[];
    moduleRoute?: string;
    recommendationFeature?: PlanFeatureKey;
    resolveState: (context: VisibilityContext) => AdminNavigationState;
};

type AdminModuleDefinition = {
    titleKey: string;
    descriptionKey: string;
    featureKeys: string[];
    recommendationFeature: PlanFeatureKey;
    buildLinks: (context: VisibilityContext) => AdminModulePageLink[];
};

const GROUP_ORDER: Array<{ id: AdminNavigationGroupId; labelKey: string }> = [
    { id: "overview", labelKey: "adminNav.groups.overview" },
    { id: "products", labelKey: "adminNav.groups.products" },
    { id: "customers", labelKey: "adminNav.groups.customers" },
    { id: "storefront", labelKey: "adminNav.groups.storefront" },
    { id: "operations", labelKey: "adminNav.groups.operations" },
];

function isEffectiveAccess(
    value: CompanyCapabilities | EffectiveCompanyAccess | null | undefined,
): value is EffectiveCompanyAccess {
    return Boolean(
        value &&
        typeof value === "object" &&
        "lifecycle" in value &&
        "entitlements" in value,
    );
}

type NavigationAccessSource = CompanyCapabilities | EffectiveCompanyAccess | null | undefined;

function hasProduct(
    source: NavigationAccessSource,
    productCode: ProductCode,
): boolean {
    if (isEffectiveAccess(source)) return hasEffectiveProduct(source, productCode);
    const entitlements = source;
    return (
        entitlements?.products?.some(
            (product) =>
                product.productCode === productCode &&
                (product.status === "ACTIVE" || product.status === "TRIALING"),
        ) ?? false
    );
}

function hasTier(
    source: NavigationAccessSource,
    tierCode: ProductTierCode,
): boolean {
    if (isEffectiveAccess(source)) return hasEffectiveTier(source, tierCode);
    const entitlements = source;
    return (
        entitlements?.products?.some(
            (product) =>
                product.tierCode === tierCode &&
                (product.status === "ACTIVE" || product.status === "TRIALING"),
        ) ?? false
    );
}

function buildVisibilityContext(
    source: NavigationAccessSource,
): VisibilityContext {
    const access = isEffectiveAccess(source) ? source : null;
    const entitlements = access?.entitlements ?? (source as CompanyCapabilities | null | undefined);
    const hasReservas = hasProduct(source, "RESERVAS");
    const hasStores = hasProduct(source, "STORES");
    const hasEventos = hasProduct(source, "EVENTOS");
    const hasClases = hasProduct(source, "CLASES");

    return {
        access,
        entitlements,
        hasAnyCoreProduct: entitlements?.products?.some((product) => product.isCore) ?? false,
        isStoreOnlyCompany: hasStores && !hasReservas && !hasEventos && !hasClases,
        hasReservas,
        hasStores,
        hasEventos,
        hasClases,
        hasReservasPro: hasTier(source, "RESERVAS_PRO"),
        hasEventosPro: hasTier(source, "EVENTOS_PRO"),
        hasClasesPro: hasTier(source, "CLASES_PRO"),
        hasCrmPro: hasTier(source, "CRM_PRO"),
        hasMessagingPro: hasTier(source, "MENSAJERIA_PRO"),
        hasMetricsPro: hasTier(source, "METRICAS_PRO"),
        hasCustomizationPlus: hasTier(source, "PERSONALIZACION_PLUS"),
        hasRestaurant: access
            ? hasEffectiveCapability(access, "RESTAURANT_MODULE")
            : canUseEntitledFeature(entitlements, "RESTAURANT_MODULE"),
    };
}

const NAVIGATION_DEFINITIONS: AdminNavigationDefinition[] = [
    {
        id: "dashboard",
        groupId: "overview",
        labelKey: "adminNav.dashboard",
        href: "/admin/dashboard",
        iconKey: "dashboard",
        roles: ["OWNER", "ADMIN", "STAFF"],
        exact: true,
        resolveState: (context) => (context.isStoreOnlyCompany ? "hidden" : "active"),
    },
    {
        id: "bookings",
        groupId: "products",
        labelKey: "adminNav.bookings",
        href: "/admin/dashboard/bookings",
        iconKey: "bookings",
        roles: ["OWNER", "ADMIN", "STAFF"],
        resolveState: (context) => (context.hasReservas ? "active" : "hidden"),
    },
    {
        id: "services",
        groupId: "products",
        labelKey: "adminNav.services",
        href: "/admin/dashboard/services",
        iconKey: "services",
        roles: ["OWNER", "ADMIN"],
        resolveState: (context) => (context.hasReservas ? "active" : "hidden"),
    },
    {
        id: "store",
        groupId: "products",
        labelKey: "adminNav.store",
        href: "/admin/dashboard/store/orders",
        iconKey: "storefront",
        roles: ["OWNER", "ADMIN", "STAFF"],
        children: [
            {
                id: "store-overview",
                labelKey: "adminStore.nav.overview",
                href: "/admin/dashboard/store",
                exact: true,
                roles: ["OWNER", "ADMIN", "STAFF"],
            },
            {
                id: "store-orders",
                labelKey: "adminStore.nav.orders",
                href: "/admin/dashboard/store/orders",
                roles: ["OWNER", "ADMIN", "STAFF"],
            },
            {
                id: "store-products",
                labelKey: "adminStore.nav.products",
                href: "/admin/dashboard/store/products",
                roles: ["OWNER", "ADMIN", "STAFF"],
            },
            {
                id: "store-points-of-sale",
                labelKey: "adminStore.nav.pointsOfSale",
                href: "/admin/dashboard/store/points-of-sale",
                roles: ["OWNER", "ADMIN", "STAFF"],
            },
            {
                id: "store-categories",
                labelKey: "adminStore.nav.categories",
                href: "/admin/dashboard/store/categories",
                roles: ["OWNER", "ADMIN", "STAFF"],
            },
            {
                id: "store-settings",
                labelKey: "adminStore.nav.settings",
                href: "/admin/dashboard/store/settings",
                roles: ["OWNER", "ADMIN"],
            },
        ],
        resolveState: (context) => (context.hasStores ? "active" : "hidden"),
    },
    {
        id: "restaurant",
        groupId: "products",
        labelKey: "adminNav.restaurant",
        href: "/admin/dashboard/restaurant",
        iconKey: "restaurant",
        roles: ["OWNER", "ADMIN"],
        children: [
            { id: "restaurant-operations", labelKey: "restaurant.nav.operations", href: "/admin/dashboard/restaurant" },
            { id: "restaurant-reservations", labelKey: "restaurant.nav.reservations", href: "/admin/dashboard/restaurant/reservations" },
            { id: "restaurant-menu", labelKey: "restaurant.nav.menu", href: "/admin/dashboard/restaurant/menu" },
            { id: "restaurant-settings", labelKey: "restaurant.nav.settings", href: "/admin/dashboard/restaurant/settings" },
            { id: "restaurant-tables", labelKey: "restaurant.nav.tables", href: "/admin/dashboard/restaurant/tables" },
        ],
        resolveState: (context) => (context.hasRestaurant ? "active" : "hidden"),
    },
    {
        id: "availability",
        groupId: "products",
        labelKey: "adminNav.availability",
        href: "/admin/dashboard/availability",
        iconKey: "availability",
        roles: ["OWNER", "ADMIN", "STAFF"],
        resolveState: (context) => (context.hasReservas ? "active" : "hidden"),
    },
    {
        id: "time-off",
        groupId: "products",
        labelKey: "adminNav.timeOff",
        href: "/admin/dashboard/time-off",
        iconKey: "timeOff",
        roles: ["OWNER", "ADMIN", "STAFF"],
        exact: true,
        activePrefixes: ["/admin/dashboard/time-off", "/admin/dashboard/permissions"],
        resolveState: (context) => (context.hasReservas ? "active" : "hidden"),
    },
    {
        id: "booking-settings",
        groupId: "products",
        labelKey: "adminNav.bookingSettings",
        href: "/admin/dashboard/settings",
        iconKey: "settings",
        roles: ["OWNER", "ADMIN"],
        exact: true,
        resolveState: (context) => (context.hasReservas ? "active" : "hidden"),
    },
    {
        id: "events",
        groupId: "products",
        labelKey: "adminNav.events",
        href: "/admin/dashboard/group-reservations/events",
        iconKey: "events",
        roles: ["OWNER", "ADMIN"],
        moduleRoute: "/admin/dashboard/modules/events",
        recommendationFeature: "GROUP_EVENTS",
        resolveState: (context) => (context.hasEventos ? "active" : "locked"),
    },
    {
        id: "classes",
        groupId: "products",
        labelKey: "adminNav.classes",
        href: "/admin/dashboard/group-reservations/classes",
        iconKey: "classes",
        roles: ["OWNER", "ADMIN"],
        moduleRoute: "/admin/dashboard/modules/classes",
        recommendationFeature: "GROUP_CLASSES",
        resolveState: (context) => (context.hasClases ? "active" : "locked"),
    },
    {
        id: "customers",
        groupId: "customers",
        labelKey: "adminNav.customers",
        href: "/admin/dashboard/customers",
        iconKey: "customers",
        roles: ["OWNER", "ADMIN"],
        resolveState: () => "active",
    },
    {
        id: "crm-pro",
        groupId: "customers",
        labelKey: "adminNav.crmPro",
        href: "/admin/dashboard/modules/crm-pro",
        iconKey: "crm",
        roles: ["OWNER", "ADMIN"],
        recommendationFeature: "CUSTOMER_IMPORT_EXPORT",
        resolveState: (context) => (context.hasCrmPro ? "active" : "locked"),
    },
    {
        id: "messaging-pro",
        groupId: "customers",
        labelKey: "adminNav.messagingPro",
        href: "/admin/dashboard/modules/messaging-pro",
        iconKey: "messaging",
        roles: ["OWNER", "ADMIN"],
        recommendationFeature: "BULK_WHATSAPP_MESSAGING",
        resolveState: (context) => (context.hasMessagingPro ? "active" : "locked"),
    },
    {
        id: "metrics-pro",
        groupId: "customers",
        labelKey: "adminNav.metricsPro",
        href: "/admin/dashboard/modules/metrics-pro",
        iconKey: "metrics",
        roles: ["OWNER", "ADMIN"],
        recommendationFeature: "OPERATIONAL_DASHBOARD",
        resolveState: (context) => (context.hasMetricsPro ? "active" : "locked"),
    },
    {
        id: "storefront",
        groupId: "storefront",
        labelKey: "adminNav.publicPage",
        href: "/admin/dashboard/storefront/content",
        iconKey: "storefront",
        roles: ["OWNER", "ADMIN"],
        activePrefixes: [
            "/admin/dashboard/storefront",
            "/admin/dashboard/storefront-builder",
            "/admin/dashboard/theme",
            "/admin/dashboard/page-management",
        ],
        resolveState: () => "active",
    },
    {
        id: "customization-plus",
        groupId: "storefront",
        labelKey: "adminNav.personalizationPlus",
        href: "/admin/dashboard/modules/customization-plus",
        iconKey: "customization",
        roles: ["OWNER", "ADMIN"],
        recommendationFeature: "HOME_CTA_CUSTOMIZATION",
        resolveState: (context) => (context.hasCustomizationPlus ? "active" : "locked"),
    },
    {
        id: "hours",
        groupId: "operations",
        labelKey: "adminNav.hours",
        href: "/admin/dashboard/hours",
        iconKey: "hours",
        roles: ["OWNER", "ADMIN"],
        resolveState: (context) => (context.hasAnyCoreProduct ? "active" : "hidden"),
    },
    {
        id: "staff",
        groupId: "operations",
        labelKey: "adminNav.staff",
        href: "/admin/dashboard/staff",
        iconKey: "staff",
        roles: ["OWNER", "ADMIN"],
        resolveState: (context) => (context.hasAnyCoreProduct ? "active" : "hidden"),
    },
    {
        id: "billing",
        groupId: "operations",
        labelKey: "adminNav.planBilling",
        href: "/admin/dashboard/billing",
        iconKey: "settings",
        roles: ["OWNER", "ADMIN"],
        exact: true,
        resolveState: () => "active",
    },
    {
        id: "business-settings",
        groupId: "operations",
        labelKey: "adminNav.basicSettings",
        href: "/admin/dashboard/business-settings",
        iconKey: "settings",
        roles: ["OWNER", "ADMIN"],
        exact: true,
        resolveState: () => "active",
    },
    {
        id: "profile",
        groupId: "operations",
        labelKey: "adminNav.profile",
        href: "/admin/dashboard/profile",
        iconKey: "profile",
        roles: ["OWNER", "ADMIN", "STAFF"],
        exact: true,
        resolveState: () => "active",
    },
];

const MODULE_DEFINITIONS: Partial<Record<AdminNavigationItemId, AdminModuleDefinition>> = {
    events: {
        titleKey: "adminModules.events.title",
        descriptionKey: "adminModules.events.description",
        featureKeys: [
            "adminModules.events.features.management",
            "adminModules.events.features.attendees",
            "adminModules.events.features.checkIn",
        ],
        recommendationFeature: "GROUP_EVENTS",
        buildLinks: (context) => [
            {
                href: "/admin/dashboard/group-reservations/events",
                labelKey: "adminModules.events.links.events",
                descriptionKey: "adminModules.events.links.eventsDesc",
            },
            {
                href: "/admin/dashboard/group-reservations/attendance",
                labelKey: "adminModules.events.links.checkIn",
                descriptionKey: "adminModules.events.links.checkInDesc",
                hidden: !context.hasEventosPro,
            },
            {
                href: "/admin/dashboard/group-reservations/metrics",
                labelKey: "adminModules.events.links.analytics",
                descriptionKey: "adminModules.events.links.analyticsDesc",
                hidden: !context.hasMetricsPro,
            },
        ],
    },
    classes: {
        titleKey: "adminModules.classes.title",
        descriptionKey: "adminModules.classes.description",
        featureKeys: [
            "adminModules.classes.features.programs",
            "adminModules.classes.features.sessions",
            "adminModules.classes.features.attendance",
        ],
        recommendationFeature: "GROUP_CLASSES",
        buildLinks: (context) => [
            {
                href: "/admin/dashboard/group-reservations/classes",
                labelKey: "adminModules.classes.links.classes",
                descriptionKey: "adminModules.classes.links.classesDesc",
            },
            {
                href: "/admin/dashboard/group-reservations/classes/upcoming",
                labelKey: "adminModules.classes.links.sessions",
                descriptionKey: "adminModules.classes.links.sessionsDesc",
            },
            {
                href: "/admin/dashboard/group-reservations/attendance",
                labelKey: "adminModules.classes.links.attendance",
                descriptionKey: "adminModules.classes.links.attendanceDesc",
                hidden: !context.hasClasesPro,
            },
        ],
    },
    "crm-pro": {
        titleKey: "adminModules.crm.title",
        descriptionKey: "adminModules.crm.description",
        featureKeys: [
            "adminModules.crm.features.importExport",
            "adminModules.crm.features.segmentation",
            "adminModules.crm.features.reactivation",
        ],
        recommendationFeature: "CUSTOMER_IMPORT_EXPORT",
        buildLinks: (context) => [
            {
                href: "/admin/dashboard/customers",
                labelKey: "adminModules.crm.links.customers",
                descriptionKey: "adminModules.crm.links.customersDesc",
            },
            {
                href: "/admin/dashboard/customers/import-export",
                labelKey: "adminModules.crm.links.importExport",
                descriptionKey: "adminModules.crm.links.importExportDesc",
            },
            {
                href: "/admin/dashboard/customers/communications",
                labelKey: "adminModules.crm.links.bulkActions",
                descriptionKey: "adminModules.crm.links.bulkActionsDesc",
                hidden: !context.hasMessagingPro,
            },
        ],
    },
    "messaging-pro": {
        titleKey: "adminModules.messaging.title",
        descriptionKey: "adminModules.messaging.description",
        featureKeys: [
            "adminModules.messaging.features.reminders",
            "adminModules.messaging.features.campaigns",
            "adminModules.messaging.features.reviewRequests",
        ],
        recommendationFeature: "BULK_WHATSAPP_MESSAGING",
        buildLinks: () => [
            {
                href: "/admin/dashboard/bookings",
                labelKey: "adminModules.messaging.links.reminders",
                descriptionKey: "adminModules.messaging.links.remindersDesc",
            },
            {
                href: "/admin/dashboard/customers/communications",
                labelKey: "adminModules.messaging.links.campaigns",
                descriptionKey: "adminModules.messaging.links.campaignsDesc",
            },
            {
                href: "/admin/dashboard/reviews",
                labelKey: "adminModules.messaging.links.reviewRequests",
                descriptionKey: "adminModules.messaging.links.reviewRequestsDesc",
            },
        ],
    },
    "metrics-pro": {
        titleKey: "adminModules.metrics.title",
        descriptionKey: "adminModules.metrics.description",
        featureKeys: [
            "adminModules.metrics.features.dashboard",
            "adminModules.metrics.features.groupAnalytics",
            "adminModules.metrics.features.reviewAnalytics",
        ],
        recommendationFeature: "OPERATIONAL_DASHBOARD",
        buildLinks: (context) => [
            {
                href: "/admin/dashboard",
                labelKey: "adminModules.metrics.links.dashboard",
                descriptionKey: "adminModules.metrics.links.dashboardDesc",
            },
            {
                href: "/admin/dashboard/group-reservations/metrics",
                labelKey: "adminModules.metrics.links.groupAnalytics",
                descriptionKey: "adminModules.metrics.links.groupAnalyticsDesc",
                hidden: !context.hasEventos && !context.hasClases,
            },
            {
                href: "/admin/dashboard/reviews",
                labelKey: "adminModules.metrics.links.reviewAnalytics",
                descriptionKey: "adminModules.metrics.links.reviewAnalyticsDesc",
            },
        ],
    },
    "customization-plus": {
        titleKey: "adminModules.customization.title",
        descriptionKey: "adminModules.customization.description",
        featureKeys: [
            "adminModules.customization.features.banners",
            "adminModules.customization.features.sectionOrder",
            "adminModules.customization.features.footer",
        ],
        recommendationFeature: "HOME_CTA_CUSTOMIZATION",
        buildLinks: () => [
            {
                href: "/admin/dashboard/storefront/content",
                labelKey: "adminModules.customization.links.content",
                descriptionKey: "adminModules.customization.links.contentDesc",
            },
            {
                href: "/admin/dashboard/storefront/sections",
                labelKey: "adminModules.customization.links.sections",
                descriptionKey: "adminModules.customization.links.sectionsDesc",
            },
            {
                href: "/admin/dashboard/storefront/media",
                labelKey: "adminModules.customization.links.media",
                descriptionKey: "adminModules.customization.links.mediaDesc",
            },
        ],
    },
};

function buildNavigationItem(
    definition: AdminNavigationDefinition,
    context: VisibilityContext,
): AdminNavigationItem {
    const state = definition.resolveState(context);
    const href =
        state === "locked" && definition.moduleRoute
            ? definition.moduleRoute
            : definition.href;
    const activePrefixes = [
        href,
        definition.href,
        ...(definition.activePrefixes ?? []),
        ...(definition.moduleRoute ? [definition.moduleRoute] : []),
    ];

    return {
        id: definition.id,
        groupId: definition.groupId,
        labelKey: definition.labelKey,
        href,
        iconKey: definition.iconKey,
        roles: definition.roles,
        state,
        exact: definition.exact,
        activePrefixes: Array.from(new Set(activePrefixes)),
        children: definition.children,
        recommendationFeature: definition.recommendationFeature,
        moduleRoute: definition.moduleRoute,
    };
}

export function getAdminNavigationCatalog(
    source: NavigationAccessSource,
): AdminNavigationItem[] {
    const context = buildVisibilityContext(source);
    return NAVIGATION_DEFINITIONS.map((definition) => buildNavigationItem(definition, context));
}

type AdminNavigationOptions = {
    includeLocked?: boolean;
    role?: AdminNavigationRole | null;
};

function filterNavigationItems(
    items: AdminNavigationItem[],
    options?: AdminNavigationOptions,
): AdminNavigationItem[] {
    const includeLocked = options?.includeLocked ?? true;

    return items
        .filter((item) => {
        if (item.state === "hidden") return false;
        if (!includeLocked && item.state === "locked") return false;
        if (options?.role && !item.roles.includes(options.role)) return false;
        return true;
        })
        .map((item) => ({
            ...item,
            children: item.children?.filter(
                (child) => !options?.role || !child.roles || child.roles.includes(options.role),
            ),
        }));
}

export function getAdminNavigationForEntitlements(
    source: NavigationAccessSource,
    options?: AdminNavigationOptions,
): AdminNavigationGroup[] {
    const context = buildVisibilityContext(source);
    let items = filterNavigationItems(getAdminNavigationCatalog(source), options);

    if (context.access?.lifecycle.mode === "RENEWAL_ONLY") {
        items = items.filter((item) => item.id === "billing" || item.id === "profile");
    }
    if (context.access?.lifecycle.mode === "BLOCKED") {
        items = [];
    }

    return GROUP_ORDER.map((group) => ({
        id: group.id,
        labelKey: group.labelKey,
        items: items.filter((item) => item.groupId === group.id),
    })).filter((group) => group.items.length > 0);
}

export function getAdminNavigationForAccess(
    access: EffectiveCompanyAccess | null | undefined,
    options?: AdminNavigationOptions,
): AdminNavigationGroup[] {
    return getAdminNavigationForEntitlements(access, options);
}

export function getDefaultAdminHref(
    source: NavigationAccessSource,
    role?: AdminNavigationRole | null,
): string {
    const firstVisibleItem = getAdminNavigationForEntitlements(source, {
        includeLocked: false,
        role: role ?? null,
    })
        .flatMap((group) => group.items)
        .at(0);

    return firstVisibleItem?.href ?? "/admin/dashboard";
}

export function isStoreOnlyAdminCompany(
    source: NavigationAccessSource,
): boolean {
    return buildVisibilityContext(source).isStoreOnlyCompany;
}

export function getAdminNavigationItemById(
    itemId: string,
    source: NavigationAccessSource,
): AdminNavigationItem | null {
    return getAdminNavigationCatalog(source).find((item) => item.id === itemId) ?? null;
}

export function getAdminModulePageModel(
    itemId: string,
    source: NavigationAccessSource,
): AdminModulePageModel | null {
    const item = getAdminNavigationItemById(itemId, source);
    if (!item || item.state === "hidden") return null;

    const moduleDefinition = MODULE_DEFINITIONS[item.id];
    if (!moduleDefinition) return null;

    const context = buildVisibilityContext(source);

    return {
        id: item.id,
        state: item.state,
        titleKey: moduleDefinition.titleKey,
        descriptionKey: moduleDefinition.descriptionKey,
        featureKeys: moduleDefinition.featureKeys,
        recommendation: getProductAccessRecommendationForFeature(
            moduleDefinition.recommendationFeature,
            context.entitlements,
        ),
        links: moduleDefinition.buildLinks(context).filter((link) => !link.hidden),
    };
}
