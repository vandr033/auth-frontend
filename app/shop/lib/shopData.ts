import type { ShopCompany, ShopData, ShopHours, ShopStaff } from "@/types/shop";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001/api";

type StaffServiceRelation = {
    service_id: number;
};

type RawShopStaff = Omit<ShopStaff, "services"> & {
    services?: number[];
    staff_services?: StaffServiceRelation[];
};

export type RawShopData = Omit<ShopData, "staff" | "hours"> & {
    company: ShopCompany & { hours?: ShopHours[] };
    staff: RawShopStaff[];
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
    return {
        ...rawData,
        hours: rawData.company?.hours || rawData.hours || [],
        staff: (rawData.staff || []).map((member) => ({
            ...member,
            services: member.services || member.staff_services?.map((service) => service.service_id) || [],
        })),
    };
}
