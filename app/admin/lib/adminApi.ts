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
    bookingsByStatus: { status: string; count: number }[];
    bookingsByCategory: { categoryName: string | null; count: number }[];
    customerInsights: {
        totalCustomers: number;
        newCustomersThisMonth: number;
        newCustomersThisWeek: number;
        returningCustomers: number;
        repeatRate: number;
        avgBookingsPerCustomer: number;
    };
    busiestMoments: {
        busiestDays: { dayOfWeek: number; count: number }[];
        busiestHours: { hour: number; count: number }[];
    };
    customerGrowthTrend: { month: string; newCustomers: number }[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiFetch<{ data: DashboardMetrics }>("/api/admin/dashboard/metrics");
    return response.data;
}

// ============ CUSTOMERS ============

export interface CustomerRecord {
    id: number;
    customerKey: string;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    phonePrefix: string | null;
    notes: string | null;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
    lastBookingAt: string | null;
    nextBookingAt: string | null;
    totalSpentCents: number;
    avgTicketCents: number;
    favoriteStaffName: string | null;
    favoriteStaffBookingCount: number;
    preferredServiceName: string | null;
    preferredCategoryName: string | null;
    preferredServiceBookingCount: number;
    bookingFrequencyPerMonth: number;
    recentActivity: {
        bookingId: number | null;
        happenedAt: string | null;
        status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | null;
        staffName: string | null;
        serviceName: string | null;
    };
}

export async function getCustomers(search?: string): Promise<CustomerRecord[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiFetch<{ data: CustomerRecord[] }>(`/api/admin/customers${params}`);
    return response.data;
}

export interface CustomerHistoryItem {
    id: number;
    startAt: string;
    endAt: string;
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    source: "MARKETPLACE" | "SALON_SITE" | "ADMIN" | "MANUAL";
    totalPriceCents: number;
    notes: string | null;
    staffName: string;
    services: Array<{
        serviceName: string | null;
        categoryName: string | null;
        durationMinutes: number;
        priceCents: number;
    }>;
}

export interface CustomerHistoryResponse {
    items: CustomerHistoryItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}

export async function getCustomerHistory(
    customerKey: string,
    page = 1,
    limit = 10,
): Promise<CustomerHistoryResponse> {
    const query = new URLSearchParams({
        customer_key: customerKey,
        page: String(page),
        limit: String(limit),
    });

    const response = await apiFetch<{ data: CustomerHistoryResponse }>(
        `/api/admin/customers/history?${query.toString()}`
    );
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

export async function downloadCustomersExport(search?: string): Promise<{ blob: Blob; fileName: string | null }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetch(resolveUrl(`/api/admin/customers/export${query}`), {
        credentials: "include",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
            data?.error ||
            data?.message ||
            `Request failed: ${response.status}`;
        throw new Error(message);
    }

    const contentDisposition = response.headers.get("content-disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    const fileName = fileNameMatch?.[1] || null;

    return {
        blob: await response.blob(),
        fileName,
    };
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

export type NoShowNotificationChannel = "AUTO" | "WHATSAPP" | "EMAIL";

export interface NoShowNotificationPayload {
    channel?: NoShowNotificationChannel;
    message?: string;
}

export interface NoShowNotificationResult {
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

export async function sendNoShowNotification(
    bookingId: number,
    payload: NoShowNotificationPayload
): Promise<NoShowNotificationResult> {
    const response = await apiFetch<{ data: NoShowNotificationResult }>(`/api/admin/bookings/${bookingId}/notifications/no-show`, {
        method: "POST",
        body: JSON.stringify(payload),
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
    bio?: string;
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

// ============ REVIEWS ============

export interface AdminReviewFilters {
    page?: number;
    limit?: number;
    search?: string;
    rating?: number;
    staffId?: number;
    serviceId?: number;
    hasComment?: boolean;
    dateFrom?: string;
    dateTo?: string;
}

export interface AdminReview {
    id: number;
    rating: number;
    comment: string | null;
    rating_service_quality: number | null;
    rating_staff_attention: number | null;
    rating_punctuality: number | null;
    rating_cleanliness: number | null;
    created_at: string;
    user: { first_name: string | null; last_name: string | null; image: string | null };
    service: { id: number; name: string } | null;
    staff: { id: number; display_name: string } | null;
    booking: { id: number; start_at: string; end_at: string; status: string } | null;
    company: { id: number; name: string } | null;
}

export interface AdminReviewsResponse {
    reviews: AdminReview[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
    };
}

export interface ReviewExtendedMetrics {
    average: number;
    count: number;
    distribution: Record<number, number>;
    subRatings: {
        serviceQuality: number | null;
        staffAttention: number | null;
        punctuality: number | null;
        cleanliness: number | null;
    };
    volume: Array<{ month: string; count: number; avgRating: number }>;
    topStaff: Array<{ staffId: number; name: string; avgRating: number; reviewCount: number }>;
    topServices: Array<{ serviceId: number; name: string; avgRating: number; reviewCount: number }>;
    recentLowRatings: AdminReview[];
}

export async function getAdminReviews(filters: AdminReviewFilters = {}): Promise<AdminReviewsResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.rating) params.set("rating", String(filters.rating));
    if (filters.staffId) params.set("staff_id", String(filters.staffId));
    if (filters.serviceId) params.set("service_id", String(filters.serviceId));
    if (filters.hasComment !== undefined) params.set("has_comment", String(filters.hasComment));
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);

    const query = params.toString();
    const response = await apiFetch<{ data: AdminReviewsResponse }>(`/api/admin/reviews${query ? `?${query}` : ""}`);
    return response.data;
}

export async function getReviewExtendedMetrics(): Promise<ReviewExtendedMetrics> {
    const response = await apiFetch<{ data: ReviewExtendedMetrics }>("/api/admin/reviews/metrics");
    return response.data;
}

export async function deleteAdminReview(reviewId: number): Promise<void> {
    await apiFetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
}

export async function exportAdminReviews(): Promise<AdminReview[]> {
    const response = await apiFetch<{ data: AdminReview[] }>("/api/admin/reviews/export");
    return response.data;
}
