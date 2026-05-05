import type { CompanyCapabilities } from "@/lib/plans/capabilities";
import { hasProductCapability, hasProductTier } from "@/lib/product-access";
import type { HomeSectionKey, ShopPublicFeatureVisibility } from "@/types/shop";

type HomeSectionDefinition = {
    key: HomeSectionKey;
    isConfigurable: (capabilities: CompanyCapabilities | null | undefined) => boolean;
    isRenderable: (publicFeatures: ShopPublicFeatureVisibility) => boolean;
    defaultPriority: number;
    storeOnlyPriority: number;
};

function hasStoreCapability(
    capabilities: CompanyCapabilities | null | undefined,
): boolean {
    if (hasProductCapability(capabilities, "COMMERCE_ACCESS")) {
        return true;
    }

    if (hasProductTier(capabilities, "STORES_BASE") || hasProductTier(capabilities, "STORES_PRO")) {
        return true;
    }

    return (
        capabilities?.products?.some(
            (product) =>
                product.productCode === "STORES" &&
                (product.status === "ACTIVE" || product.status === "TRIALING"),
        ) ?? false
    );
}

const HOME_SECTION_REGISTRY: HomeSectionDefinition[] = [
    {
        key: "about",
        isConfigurable: () => true,
        isRenderable: () => true,
        defaultPriority: 10,
        storeOnlyPriority: 20,
    },
    {
        key: "services",
        isConfigurable: (capabilities) => hasProductCapability(capabilities, "RESERVAS_BASE"),
        isRenderable: (publicFeatures) => publicFeatures.servicesVisible,
        defaultPriority: 20,
        storeOnlyPriority: 999,
    },
    {
        key: "products",
        isConfigurable: (capabilities) => hasStoreCapability(capabilities),
        isRenderable: (publicFeatures) => publicFeatures.commerceVisible,
        defaultPriority: 30,
        storeOnlyPriority: 10,
    },
    {
        key: "promotions",
        isConfigurable: (capabilities) => hasProductCapability(capabilities, "COMMERCE_PROMOTIONS"),
        isRenderable: (publicFeatures) => publicFeatures.commercePromotionsVisible,
        defaultPriority: 40,
        storeOnlyPriority: 30,
    },
    {
        key: "combos",
        isConfigurable: (capabilities) => hasProductCapability(capabilities, "COMMERCE_COMBOS"),
        isRenderable: (publicFeatures) => publicFeatures.commerceCombosVisible,
        defaultPriority: 50,
        storeOnlyPriority: 40,
    },
    {
        key: "events",
        isConfigurable: (capabilities) => hasProductCapability(capabilities, "EVENTOS_BASE"),
        isRenderable: (publicFeatures) => publicFeatures.eventsVisible,
        defaultPriority: 60,
        storeOnlyPriority: 999,
    },
    {
        key: "classes",
        isConfigurable: (capabilities) => hasProductCapability(capabilities, "CLASES_BASE"),
        isRenderable: (publicFeatures) => publicFeatures.classesVisible,
        defaultPriority: 70,
        storeOnlyPriority: 999,
    },
    {
        key: "team",
        isConfigurable: () => true,
        isRenderable: () => true,
        defaultPriority: 80,
        storeOnlyPriority: 50,
    },
];

export const ALL_HOME_SECTION_KEYS: HomeSectionKey[] = HOME_SECTION_REGISTRY.map((section) => section.key);

function filterSectionKeys(
    source: HomeSectionKey[],
    availableKeys: readonly HomeSectionKey[],
): HomeSectionKey[] {
    const available = new Set<HomeSectionKey>(availableKeys);
    return source.filter((key, index) => {
        return available.has(key) && source.indexOf(key) === index;
    });
}

export function getConfigurableHomeSectionKeys(
    capabilities: CompanyCapabilities | null | undefined,
): HomeSectionKey[] {
    return HOME_SECTION_REGISTRY
        .filter((section) => section.isConfigurable(capabilities))
        .map((section) => section.key);
}

export function getRenderableHomeSectionKeys(
    publicFeatures: ShopPublicFeatureVisibility,
): HomeSectionKey[] {
    return HOME_SECTION_REGISTRY
        .filter((section) => section.isRenderable(publicFeatures))
        .map((section) => section.key);
}

export function getDefaultHomeSectionOrder(
    availableKeys: readonly HomeSectionKey[],
): HomeSectionKey[] {
    const available = new Set<HomeSectionKey>(availableKeys);
    const hasReservas = available.has("services");
    const hasStore = available.has("products");
    const hasEvents = available.has("events");
    const hasClasses = available.has("classes");
    const isStoreOnly = hasStore && !hasReservas && !hasEvents && !hasClasses;
    const priorityByKey = new Map<HomeSectionKey, number>(
        HOME_SECTION_REGISTRY.map((section) => [
            section.key,
            isStoreOnly ? section.storeOnlyPriority : section.defaultPriority,
        ]),
    );
    const orderedKeys = [...ALL_HOME_SECTION_KEYS].sort((left, right) => {
        return (priorityByKey.get(left) ?? Number.MAX_SAFE_INTEGER)
            - (priorityByKey.get(right) ?? Number.MAX_SAFE_INTEGER);
    });

    return filterSectionKeys(orderedKeys, availableKeys);
}

export function resolveHomeSectionOrder(params: {
    storedOrder: HomeSectionKey[] | null | undefined;
    availableKeys: readonly HomeSectionKey[];
    preferDefaultOrder?: boolean;
}): HomeSectionKey[] {
    const defaultOrder = getDefaultHomeSectionOrder(params.availableKeys);
    const baseOrder = params.preferDefaultOrder ? defaultOrder : (params.storedOrder ?? []);
    const visibleOrder = filterSectionKeys(baseOrder, params.availableKeys);
    const missingKeys = defaultOrder.filter((key) => !visibleOrder.includes(key));
    return [...visibleOrder, ...missingKeys];
}
