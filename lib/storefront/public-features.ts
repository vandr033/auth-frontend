import type { CTADestination, ShopCompany, ShopPublicFeatureVisibility } from "@/types/shop";

const DEFAULT_PUBLIC_FEATURES: ShopPublicFeatureVisibility = {
    storefrontEnabled: true,
    companyInfoVisible: true,
    contactVisible: true,
    servicesVisible: true,
    bookingsEnabled: true,
    commerceVisible: false,
    commercePromotionsVisible: false,
    commerceCombosVisible: false,
    eventsVisible: false,
    eventRegistrationEnabled: false,
    eventAdvancedEnabled: false,
    eventWaitlistEnabled: false,
    eventTicketsEnabled: false,
    classesVisible: false,
    classEnrollmentEnabled: false,
    classAdvancedEnabled: false,
    classPaymentPlansEnabled: false,
    classAttendanceEnabled: false,
    personalizationPlusEnabled: false,
    customCtasVisible: false,
    announcementBannersVisible: false,
    advancedSectionsVisible: false,
    footerCustomizationVisible: false,
    marketplaceListed: false,
};

export function getShopPublicFeatures(
    company?: ShopCompany | null,
): ShopPublicFeatureVisibility {
    return company?.entitlements?.publicFeatures
        ?? company?.public_features
        ?? DEFAULT_PUBLIC_FEATURES;
}

export function isShopDestinationVisible(
    destination: CTADestination,
    publicFeatures: ShopPublicFeatureVisibility,
): boolean {
    switch (destination) {
        case "booking":
            return publicFeatures.bookingsEnabled;
        case "services":
            return publicFeatures.servicesVisible;
        case "store":
            return publicFeatures.commerceVisible;
        case "free-events":
        case "events":
            return publicFeatures.eventsVisible;
        case "classes":
            return publicFeatures.classesVisible;
        default:
            return false;
    }
}
