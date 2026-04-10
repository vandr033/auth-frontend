import {
    type AdminCompanyLocation,
    type GroupPricingMode,
    type GroupRecurrenceType,
    type GroupStaffRole,
} from "@/app/admin/lib/adminApi";
import { toLocalDateInputValue } from "@/lib/date-only";

export type ManualStaff = {
    display_name: string;
    display_phone: string;
    role: GroupStaffRole;
};

export type ClassFormState = {
    title: string;
    slug: string;
    description: string;
    cover_image_url: string;
    thumbnail_url: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    pricing_mode: GroupPricingMode;
    price_cents: string;
    max_capacity_per_session: string;
    session_duration_minutes: string;
    recurrence_type: GroupRecurrenceType;
    recurrence_start_date: string;
    recurrence_end_date: string;
    start_time: string;
    location_text: string;
    weekdays: number[];
    monthdays: string;
    linked_staff_ids: number[];
    manual_staff: ManualStaff[];
};

export const GROUP_MEDIA_RECOMMENDED_SIZE = "1920px x 1080px";

export const WEEKDAYS = [
    { value: 0, label: "Sun" },
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
];

export const EMPTY_MANUAL_STAFF: ManualStaff = {
    display_name: "",
    display_phone: "",
    role: "INSTRUCTOR",
};

export function normalizeSlugInput(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .slice(0, 255);
}

export function slugifyInput(value: string): string {
    return normalizeSlugInput(value).replace(/-+$/g, "");
}

export function getCompanyLocationLabel(companyLocation: AdminCompanyLocation | null): string {
    if (!companyLocation) return "";
    return [companyLocation.address, companyLocation.city, companyLocation.state]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)
        .join(", ");
}

export function defaultClassForm(defaultLocationText = ""): ClassFormState {
    const day = toLocalDateInputValue();
    return {
        title: "",
        slug: "",
        description: "",
        cover_image_url: "",
        thumbnail_url: "",
        status: "DRAFT",
        pricing_mode: "PER_SESSION",
        price_cents: "0",
        max_capacity_per_session: "20",
        session_duration_minutes: "60",
        recurrence_type: "WEEKLY",
        recurrence_start_date: day,
        recurrence_end_date: "",
        start_time: "10:00",
        location_text: defaultLocationText,
        weekdays: [1, 3, 5],
        monthdays: "1,15",
        linked_staff_ids: [],
        manual_staff: [],
    };
}

export function getPricingModeLabelKey(pricingMode: GroupPricingMode): string {
    if (pricingMode === "PER_SESSION") return "adminGroup.pricing.perSession";
    if (pricingMode === "WEEKLY_PASS") return "adminGroup.pricing.weeklyPass";
    if (pricingMode === "MONTHLY_PASS") return "adminGroup.pricing.monthlyPass";
    return "adminGroup.pricing.fullCourse";
}
