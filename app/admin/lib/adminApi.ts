import { AdminBooking, BookingStatus } from "@/types/admin-booking";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Helper to build full API URL
const resolveUrl = (path: string) => {
    const base = API_BASE_URL.endsWith("/api")
        ? API_BASE_URL.replace(/\/api$/, "")
        : API_BASE_URL;
    return `${base}${path}`;
};

// Generic fetch wrapper with auth
async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(resolveUrl(path), {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        credentials: "include",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            (typeof data?.message === "string" && data.message) ||
            (typeof data?.error === "string" && data.error) ||
            `Request failed: ${response.status}`;
        throw new Error(message);
    }

    return data;
}

// ============ DASHBOARD ============

export interface DashboardMetrics {
    bookings: { total: number; thisMonth: number; thisWeek: number; today: number; upcoming7Days: number };
    revenue: { total: number; thisMonth: number; thisWeek: number; today: number; avgPerBooking: number };
    topServices: { id: number; name: string; count: number; percentage: number }[];
    topStaff: { id: number; name: string; bookingCount: number; revenue: number }[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiFetch<{ data: DashboardMetrics }>("/api/admin/dashboard/metrics");
    return response.data;
}

// ============ CUSTOMERS ============

export interface CustomerRecord {
    id: number;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    phonePrefix: string | null;
    notes: string | null;
    totalBookings: number;
    lastBookingAt: string | null;
    totalSpentCents: number;
}

export async function getCustomers(search?: string): Promise<CustomerRecord[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiFetch<{ data: CustomerRecord[] }>(`/api/admin/customers${params}`);
    return response.data;
}

export interface CustomerImportResult {
    totalRows: number;
    importedRows: number;
    skippedRows: number;
    createdUsers: number;
    linkedExistingUsers: number;
    createdCompanyUsers: number;
    createdProfiles: number;
    restoredCompanyUsers: number;
    restoredProfiles: number;
    skipped: Array<{ row: number; reason: string }>;
}

export interface MassCustomerMessageResult {
    total_customers: number;
    sent_total: number;
    sent_whatsapp: number;
    sent_email: number;
    skipped_no_contact: number;
    skipped_duplicates: number;
    failed: number;
}

export async function importCustomersFile(file: File): Promise<CustomerImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(resolveUrl("/api/admin/customers/import"), {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message = data?.error || data?.message || `Request failed: ${response.status}`;
        throw new Error(message);
    }

    return data?.data as CustomerImportResult;
}

export async function sendMassCustomerMessage(payload: {
    message: string;
    search?: string;
}): Promise<MassCustomerMessageResult> {
    const response = await apiFetch<{ data: MassCustomerMessageResult }>("/api/admin/customers/mass-message", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function downloadCustomerImportTemplate(): Promise<Blob> {
    const response = await fetch(resolveUrl("/api/admin/customers/import/template"), {
        credentials: "include",
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.blob();
}

// ============ BOOKINGS ============

export interface GetBookingsParams {
    start?: string; // ISO date string
    end?: string;   // ISO date string
    status?: BookingStatus;
    staff_id?: number;
}

export interface GetBookingsResponse {
    data: AdminBooking[];
}

export async function getBookings(params: GetBookingsParams = {}): Promise<AdminBooking[]> {
    const searchParams = new URLSearchParams();
    if (params.start) searchParams.set("start", params.start);
    if (params.end) searchParams.set("end", params.end);
    if (params.status) searchParams.set("status", params.status);
    if (params.staff_id) searchParams.set("staff_id", params.staff_id.toString());

    const query = searchParams.toString();
    const url = `/api/admin/bookings${query ? `?${query}` : ""}`;

    const response = await apiFetch<GetBookingsResponse>(url);
    return response.data;
}

export interface CreateBookingData {
    staff_id: number;
    service_ids: number[];
    start_at: string; // ISO string
    customer: {
        full_name: string;
        email?: string;
        phone?: string;
    };
    notes?: string;
}

export interface CreateBookingResponse {
    data: AdminBooking;
}

export async function createBooking(data: CreateBookingData): Promise<AdminBooking> {
    const response = await apiFetch<CreateBookingResponse>("/api/admin/bookings", {
        method: "POST",
        body: JSON.stringify(data),
    });
    return response.data;
}

export interface UpdateBookingData {
    status?: BookingStatus;
    start_at?: string;
    notes?: string | null;
    staff_id?: number;
    service_ids?: number[];
}

export interface UpdateBookingResponse {
    data: AdminBooking;
}

export async function updateBooking(id: number, data: UpdateBookingData): Promise<AdminBooking> {
    const response = await apiFetch<UpdateBookingResponse>(`/api/admin/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    return response.data;
}

export interface TodayReminderPreviewItem {
    booking_id: number;
    customer_name: string;
    start_at: string;
    channel: "WHATSAPP" | "EMAIL" | "NONE";
    already_sent_recently: boolean;
}

export interface TodayReminderPreview {
    date: string;
    total: number;
    sendable: number;
    items: TodayReminderPreviewItem[];
}

export interface TodayReminderSendResult {
    booking_id: number;
    status: "SENT" | "SKIPPED" | "FAILED";
    channel?: "WHATSAPP" | "EMAIL";
    reason?: string;
}

export async function getTodayReminderPreview(): Promise<TodayReminderPreview> {
    const response = await apiFetch<{ data: TodayReminderPreview }>("/api/admin/bookings/reminders/today/preview");
    return response.data;
}

export async function sendTodayReminder(bookingId: number): Promise<TodayReminderSendResult> {
    const response = await apiFetch<{ data: TodayReminderSendResult }>(`/api/admin/bookings/${bookingId}/reminders/today`, {
        method: "POST",
    });
    return response.data;
}

// ============ STAFF ============

export interface StaffMember {
    id: number;
    display_name: string;
    bio?: string;
    image_url?: string;
    is_bookable: boolean;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    start_date?: string | null;
    end_date?: string | null;
    company_id: number;
    user_id: string;
    user?: {
        id: string;
        email: string;
        name: string;
        first_name?: string;
        last_name?: string;
    };
    services?: number[]; // Array of service IDs this staff can perform
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface GetStaffResponse {
    data: StaffMember[];
}

export interface StaffSelfProfile {
    id: number;
    display_name: string;
    bio?: string | null;
    image_url?: string | null;
    is_bookable: boolean;
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    user: {
        id: string;
        email: string;
        name: string;
        first_name?: string | null;
        last_name?: string | null;
        phoneNumber?: string | null;
        phone_prefix?: string | null;
        image?: string | null;
    };
}

export interface UserSelfProfile {
    id: string;
    email: string;
    name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phoneNumber?: string | null;
    phone_prefix?: string | null;
    image?: string | null;
    phoneNumberVerified?: boolean;
    emailVerified?: boolean;
}

export async function getMyUserProfile(): Promise<UserSelfProfile> {
    const response = await apiFetch<{ data: { user: UserSelfProfile } }>("/api/v1/auth/me");
    return response.data.user;
}

export async function updateMyUserProfile(payload: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    phone_prefix?: string;
}): Promise<UserSelfProfile> {
    const response = await apiFetch<{ data: { user: UserSelfProfile } }>("/api/v1/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data.user;
}

export async function getMyStaffProfile(): Promise<StaffSelfProfile> {
    const response = await apiFetch<{ data: StaffSelfProfile }>("/api/admin/staff/me");
    return response.data;
}

export async function updateMyStaffProfile(payload: {
    display_name?: string;
    bio?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    phone_prefix?: string;
}): Promise<StaffSelfProfile> {
    const response = await apiFetch<{ data: StaffSelfProfile }>("/api/admin/staff/me", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function getStaff(): Promise<StaffMember[]> {
    const response = await apiFetch<GetStaffResponse>("/api/admin/staff");
    return response.data;
}

// ============ SERVICES ============

export interface ServiceCategory {
    id: number;
    name: string;
    slug: string;
    position: number;
}

export interface ServiceItem {
    id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price_cents: number;
    is_active: boolean;
    position: number;
    company_id: number;
    category_id: number;
    category: ServiceCategory;
    global_type_id?: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface GetServicesResponse {
    data: ServiceItem[];
}

export async function getServices(): Promise<ServiceItem[]> {
    const response = await apiFetch<GetServicesResponse>("/api/admin/services");
    return response.data;
}

// ============ HOURS ============

export interface HoursTimeSlot {
    id?: number;
    start_time: string; // HH:mm format
    end_time: string;
}

export interface DaySchedule {
    day: number; // 0 = Sunday, 1 = Monday, etc.
    is_open: boolean;
    slots: HoursTimeSlot[];
}

interface RawHoursRecord {
    id: number;
    day_of_week: number;
    open_time?: string;
    close_time?: string;
    is_closed: boolean;
}

interface GetHoursResponse {
    data: RawHoursRecord[] | { hours: RawHoursRecord[] };
}

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday

export async function getHours(): Promise<DaySchedule[]> {
    try {
        const response = await apiFetch<GetHoursResponse>("/api/admin/hours");
        
        // Handle both flat array and nested { hours: [] } structure
        const rawData = response.data;
        const hoursData: RawHoursRecord[] = Array.isArray(rawData) 
            ? rawData 
            : (rawData as { hours: RawHoursRecord[] }).hours || [];
        
        // Transform to DaySchedule format
        return DAYS_OF_WEEK.map((dayNum) => {
            const dayRecords = hoursData.filter((h) => h.day_of_week === dayNum);
            const isOpen = dayRecords.length > 0 && !dayRecords.some((h) => h.is_closed);
            
            return {
                day: dayNum,
                is_open: isOpen,
                slots: isOpen 
                    ? dayRecords.map((h) => ({
                        id: h.id,
                        start_time: h.open_time?.slice(0, 5) || "09:00",
                        end_time: h.close_time?.slice(0, 5) || "17:00",
                    }))
                    : [],
            };
        });
    } catch (err) {
        console.error("Failed to fetch hours:", err);
        return [];
    }
}

// ============ STAFF AVAILABILITY & TIME OFF ============

export interface StaffAvailabilitySlot {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
}

export interface StaffAvailabilityData {
    staff: {
        id: number;
        user_id: string;
        display_name: string;
        start_date?: string | null;
        end_date?: string | null;
        is_bookable: boolean;
    };
    slots: StaffAvailabilitySlot[];
}

export type StaffTimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface StaffTimeOffRequest {
    id: number;
    company_id: number;
    staff_id: number;
    requested_by_user_id: string;
    starts_at: string;
    ends_at: string;
    reason?: string | null;
    status: StaffTimeOffStatus;
    review_note?: string | null;
    reviewed_by_user_id?: string | null;
    reviewed_at?: string | null;
    created_at: string;
    updated_at: string;
    staff?: { id: number; display_name: string };
    requested_by?: { id: string; name?: string | null; email?: string | null };
    reviewed_by?: { id: string; name?: string | null; email?: string | null };
}

export async function getStaffAvailability(staffId: number): Promise<StaffAvailabilityData> {
    const response = await apiFetch<{ data: StaffAvailabilityData }>(`/api/admin/staff/${staffId}/availability`);
    return response.data;
}

export async function getMyStaffAvailability(): Promise<StaffAvailabilityData> {
    const response = await apiFetch<{ data: StaffAvailabilityData }>(`/api/admin/staff/me/availability`);
    return response.data;
}

export async function saveStaffAvailability(
    staffId: number,
    slots: StaffAvailabilitySlot[],
): Promise<StaffAvailabilityData> {
    const response = await apiFetch<{ data: StaffAvailabilityData }>(`/api/admin/staff/${staffId}/availability`, {
        method: "PUT",
        body: JSON.stringify({ slots }),
    });
    return response.data;
}

export async function listTimeOffRequests(params?: {
    status?: StaffTimeOffStatus;
    staff_id?: number;
}): Promise<StaffTimeOffRequest[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.staff_id) searchParams.set("staff_id", String(params.staff_id));

    const query = searchParams.toString();
    const response = await apiFetch<{ data: StaffTimeOffRequest[] }>(
        `/api/admin/staff/time-off${query ? `?${query}` : ""}`
    );
    return response.data;
}

export async function createTimeOffRequest(payload: {
    starts_at: string;
    ends_at: string;
    reason?: string;
    staff_id?: number;
}): Promise<StaffTimeOffRequest> {
    const response = await apiFetch<{ data: StaffTimeOffRequest }>(`/api/admin/staff/time-off`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function reviewTimeOffRequest(
    requestId: number,
    payload: { status: "APPROVED" | "REJECTED"; review_note?: string },
): Promise<StaffTimeOffRequest> {
    const response = await apiFetch<{ data: StaffTimeOffRequest }>(`/api/admin/staff/time-off/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function cancelTimeOffRequest(requestId: number): Promise<StaffTimeOffRequest> {
    const response = await apiFetch<{ data: StaffTimeOffRequest }>(`/api/admin/staff/time-off/${requestId}/cancel`, {
        method: "POST",
    });
    return response.data;
}
