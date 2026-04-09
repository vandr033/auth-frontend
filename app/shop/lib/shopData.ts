import type { ShopCompany, ShopData, ShopHours, ShopService, ShopStaff } from "@/types/shop";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001/api";

type StaffServiceRelation = {
    service_id: number;
};

type RawRequiredResource = {
    staff_profile_id: number;
};

type RawShopStaff = Omit<ShopStaff, "services"> & {
    services?: number[];
    staff_services?: StaffServiceRelation[];
};

type RawShopService = Omit<ShopService, "required_resource_ids"> & {
    required_resource_ids?: number[];
    required_resources?: RawRequiredResource[];
};

export type RawShopData = Omit<ShopData, "staff" | "hours" | "services"> & {
    company: ShopCompany & {
        hours?: ShopHours[];
        hero_home_url?: string | null;
        about_hero_image_url?: string | null;
        hero_about_url?: string | null;
    };
    staff: RawShopStaff[];
    services: RawShopService[];
    hours?: ShopHours[];
};

export type ShopApiResponse = {
    data?: RawShopData;
    message?: string;
    error?: boolean;
};

export const resolvePublicApiUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
};

export function normalizeShopData(rawData: RawShopData): ShopData {
    const normalizedCompany: ShopCompany = {
        ...rawData.company,
        home_hero_image_url:
            rawData.company.home_hero_image_url ??
            rawData.company.hero_home_url ??
            undefined,
        about_hero_image_url:
            rawData.company.about_hero_image_url ??
            rawData.company.hero_about_url ??
            undefined,
        hero_about_url:
            rawData.company.hero_about_url ??
            rawData.company.about_hero_image_url ??
            undefined,
    };

    return {
        ...rawData,
        company: normalizedCompany,
        hours: rawData.company?.hours || rawData.hours || [],
        staff: (rawData.staff || []).map((member) => ({
            ...member,
            services: member.services || member.staff_services?.map((service) => service.service_id) || [],
        })),
        services: (rawData.services || []).map((service) => ({
            ...service,
            required_resource_ids:
                service.required_resource_ids ??
                service.required_resources?.map((r) => r.staff_profile_id) ??
                [],
        })),
    };
}
