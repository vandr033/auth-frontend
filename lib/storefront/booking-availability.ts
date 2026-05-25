import { getShopPublicFeatures } from "@/lib/storefront/public-features";
import type { ShopCompany, ShopPublicFeatureVisibility, ShopService, ShopStaff } from "@/types/shop";

type BookingAvailabilityInput = {
    company?: ShopCompany | null;
    publicFeatures?: ShopPublicFeatureVisibility | null;
    isShopActive: boolean;
    services: ShopService[];
    staff: ShopStaff[];
};

export function canShopAcceptBookings({
    company,
    publicFeatures,
    isShopActive,
    services,
    staff,
}: BookingAvailabilityInput): boolean {
    const resolvedPublicFeatures = publicFeatures ?? getShopPublicFeatures(company ?? null);
    const hasBookableServices = services.length > 0;
    const hasBookableStaff = staff.some((member) => (member.services?.length ?? 0) > 0);

    return Boolean(
        isShopActive &&
        resolvedPublicFeatures.bookingsEnabled &&
        hasBookableServices &&
        hasBookableStaff,
    );
}
