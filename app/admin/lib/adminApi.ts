import { AdminBooking, BookingStatus } from "@/types/admin-booking";
import { resolveBackendUrl } from "@/lib/api-url";
import { normalizeApiError } from "@/lib/api-error";
import type {
    BusinessPricingProduct,
    BusinessPricingCoreTierKey,
    BusinessPricingProductKey,
} from "@/lib/negocios/business-pricing";
import type {
    ProductAccessRequestRow,
    ProductAccessRequestSource,
    ProductCapability,
    ProductCode,
    ProductTierCode,
} from "@/types/product-access";

// Generic fetch wrapper with auth
async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(resolveBackendUrl(path), {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        credentials: "include",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw normalizeApiError(data, response.status, `Request failed: ${response.status}`);
    }

    return data;
}

export async function getAdminProductAccessRequests(params?: {
    productCode?: ProductCode;
}): Promise<ProductAccessRequestRow[]> {
    const query = new URLSearchParams();
    if (params?.productCode) {
        query.set("productCode", params.productCode);
    }

    const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";
    const response = await apiFetch<{ data: { rows: ProductAccessRequestRow[] } }>(
        `/api/admin/product-requests${suffix}`,
    );

    return response.data.rows;
}

export async function createAdminProductAccessRequest(input: {
    productCode: ProductCode;
    tierCode: ProductTierCode;
    capability?: ProductCapability;
    message?: string;
    source: ProductAccessRequestSource;
}): Promise<{
    request: ProductAccessRequestRow;
    alreadyPending?: boolean;
}> {
    const response = await fetch(resolveBackendUrl("/api/admin/product-requests"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw normalizeApiError(payload, response.status, `Request failed: ${response.status}`);
    }

    return {
        request: payload.data.request as ProductAccessRequestRow,
        alreadyPending: payload.data.alreadyPending as boolean | undefined,
    };
}

export type SuperAdminBusinessPricingConfig = {
    products: Array<
        BusinessPricingProduct & {
            metadata?: unknown;
        }
    >;
    discounts: {
        bundleTiers: Array<{
            id: number;
            minSelectedItems: number;
            discountPercent: number;
            label: string;
            isActive: boolean;
            sortOrder: number;
        }>;
        annualDiscountPercent: number;
        trialLengthDays: number;
        firstMonthFree: boolean;
    };
};

export type SuperAdminProductFeatureSection =
    | {
        kind: "core";
        productKey: "RESERVAS" | "EVENTOS" | "CLASES";
        title: string;
        rows: Array<{
            feature: string;
            base: boolean;
            pro: boolean;
        }>;
    }
    | {
        kind: "comingSoon";
        productKey: "TIENDA";
        title: string;
        status: string;
        features: string[];
    }
    | {
        kind: "addons";
        title: string;
        rows: Array<{
            addOnKey: "PERSONALIZACION_PRO" | "METRICAS" | "MENSAJERIA_PRO" | "CRM_PRO";
            name: string;
            features: string[];
            dependency?: string | null;
            status: string;
        }>;
    };

export async function getSuperAdminBusinessPricing(): Promise<SuperAdminBusinessPricingConfig> {
    const response = await apiFetch<{ data: SuperAdminBusinessPricingConfig }>(
        "/api/super-admin/business-pricing",
    );
    return response.data;
}

export async function updateSuperAdminBusinessPricingProduct(
    productKey: BusinessPricingProductKey,
    input: {
        displayName: string;
        monthlyPriceBs: number;
        isActive: boolean;
        isComingSoon: boolean;
        sortOrder: number;
        tiers?: Array<{
            tierKey: BusinessPricingCoreTierKey;
            monthlyPriceBs: number;
        }>;
    },
): Promise<SuperAdminBusinessPricingConfig> {
    const response = await apiFetch<{ data: SuperAdminBusinessPricingConfig }>(
        `/api/super-admin/business-pricing/products/${productKey}`,
        {
            method: "PUT",
            body: JSON.stringify(input),
        },
    );

    return response.data;
}

export async function updateSuperAdminBusinessPricingDiscounts(input: {
    bundleTiers: Array<{
        minSelectedItems: number;
        discountPercent: number;
        label: string;
        isActive: boolean;
        sortOrder: number;
    }>;
}): Promise<SuperAdminBusinessPricingConfig> {
    const response = await apiFetch<{ data: SuperAdminBusinessPricingConfig }>(
        "/api/super-admin/business-pricing/discounts",
        {
            method: "PUT",
            body: JSON.stringify(input),
        },
    );

    return response.data;
}

export async function updateSuperAdminBusinessPricingSettings(input: {
    annualDiscountPercent: number;
    trialLengthDays: number;
    firstMonthFree: boolean;
}): Promise<SuperAdminBusinessPricingConfig> {
    const response = await apiFetch<{ data: SuperAdminBusinessPricingConfig }>(
        "/api/super-admin/business-pricing/settings",
        {
            method: "PUT",
            body: JSON.stringify(input),
        },
    );

    return response.data;
}

export async function getSuperAdminProductFeatures(): Promise<{
    sections: SuperAdminProductFeatureSection[];
}> {
    const response = await apiFetch<{ data: { sections: SuperAdminProductFeatureSection[] } }>(
        "/api/super-admin/product-features",
    );
    return response.data;
}

export type SuperAdminWahaStatus =
    | "CONNECTED"
    | "DISCONNECTED"
    | "QR"
    | "STARTING"
    | "ERROR";

export type SuperAdminWahaState = {
    session: string;
    status: SuperAdminWahaStatus;
    isConnected: boolean;
    needsQr: boolean;
    qr: string | null;
    qrFormat?: "image" | "raw" | null;
    account: Record<string, unknown> | null;
    message: string;
    lastCheckedAt: string;
    sessionExists: boolean;
    upstreamStatus: string | null;
};

export async function getSuperAdminWahaStatus(): Promise<SuperAdminWahaState> {
    const response = await apiFetch<{ data: SuperAdminWahaState }>(
        "/api/super-admin/waha/status",
    );

    return response.data;
}

export async function getSuperAdminWahaQr(): Promise<SuperAdminWahaState> {
    const response = await apiFetch<{ data: SuperAdminWahaState }>(
        "/api/super-admin/waha/qr",
    );

    return response.data;
}

async function postSuperAdminWahaAction(path: string): Promise<SuperAdminWahaState> {
    const response = await apiFetch<{ data: SuperAdminWahaState }>(path, {
        method: "POST",
    });

    return response.data;
}

export async function startSuperAdminWahaSession(): Promise<SuperAdminWahaState> {
    return postSuperAdminWahaAction("/api/super-admin/waha/session/start");
}

export async function restartSuperAdminWahaSession(): Promise<SuperAdminWahaState> {
    return postSuperAdminWahaAction("/api/super-admin/waha/session/restart");
}

export async function logoutSuperAdminWahaSession(): Promise<SuperAdminWahaState> {
    return postSuperAdminWahaAction("/api/super-admin/waha/session/logout");
}

export type AdminUploadImageType =
    | "logo"
    | "hero_home"
    | "hero_about"
    | "about_1"
    | "about_2"
    | "about_3"
    | "restaurant_deposit_qr"
    | "staff"
    | "group_event_cover"
    | "group_event_thumbnail"
    | "group_class_cover"
    | "group_class_thumbnail";

export async function uploadAdminImage(params: {
    file: File;
    companyId: number;
    type: AdminUploadImageType;
    entityId?: number;
}): Promise<string> {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("company_id", String(params.companyId));
    formData.append("type", params.type);
    if (params.entityId !== undefined) {
        formData.append("entity_id", String(params.entityId));
    }

    const response = await fetch(resolveBackendUrl("/api/admin/uploads/image"), {
        method: "POST",
        body: formData,
        credentials: "include",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw normalizeApiError(payload, response.status, `Upload failed: ${response.status}`);
    }

    const url = payload?.data?.url ?? payload?.url;
    if (typeof url !== "string" || url.length === 0) {
        throw new Error("Upload succeeded but no URL was returned");
    }

    return url;
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

export type CustomerSegmentKey =
    | "ALL"
    | "RETURNING"
    | "INACTIVE_90_DAYS"
    | "UPCOMING"
    | "HIGH_VALUE";

export async function getCustomers(
    params?: string | {
        search?: string;
        segment?: CustomerSegmentKey;
    },
): Promise<CustomerRecord[]> {
    const normalizedParams = typeof params === "string"
        ? { search: params }
        : (params ?? {});
    const query = new URLSearchParams();
    if (normalizedParams.search) {
        query.set("search", normalizedParams.search);
    }
    if (normalizedParams.segment && normalizedParams.segment !== "ALL") {
        query.set("segment", normalizedParams.segment);
    }

    const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";
    const response = await apiFetch<{ data: CustomerRecord[] }>(`/api/admin/customers${suffix}`);
    return response.data;
}

export async function getCustomerByKey(customerKey: string): Promise<CustomerRecord> {
    const response = await apiFetch<{ data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(customerKey)}`);
    return response.data;
}

export interface UpdateCustomerRecordInput {
    name: string;
    email?: string | null;
    phone?: string | null;
    phone_prefix?: string | null;
    country_code?: string | null;
    notes?: string | null;
}

export async function updateCustomerByKey(customerKey: string, input: UpdateCustomerRecordInput): Promise<CustomerRecord> {
    const response = await apiFetch<{ data: CustomerRecord }>(`/api/admin/customers/${encodeURIComponent(customerKey)}`, {
        method: "PUT",
        body: JSON.stringify(input),
    });
    return response.data;
}

export interface InterestCaptureLead {
    id: string;
    source: "EVENT" | "CLASS";
    sourceLabel: string;
    itemId: number;
    itemTitle: string;
    itemDate: string | null;
    personName: string | null;
    email: string | null;
    phonePrefix: string | null;
    phoneNumber: string | null;
    status: string;
    createdAt: string;
}

export async function getInterestCaptureLeads(): Promise<InterestCaptureLead[]> {
    const response = await apiFetch<{ data: InterestCaptureLead[] }>("/api/admin/customers/interest-capture");
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

export interface InstallmentReminderLogRow {
    id: number;
    channel: "WHATSAPP" | "EMAIL";
    recipient_email: string | null;
    recipient_phone: string | null;
    message_subject: string | null;
    message_body: string | null;
    sent_at: string;
    sent_by_admin_id: string | null;
    sent_by_admin?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
}

export interface CustomerGroupPaymentsResponse {
    rows: AdminGroupPaymentRow[];
    payment_plans: GroupEnrollmentInstallmentPlan[];
    summary: GroupPaymentsSummary;
    pagination: CustomerHistoryResponse["pagination"];
    currency: string | null;
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

export async function getCustomerGroupPayments(
    customerKey: string,
    page = 1,
    limit = 25,
): Promise<CustomerGroupPaymentsResponse> {
    const query = new URLSearchParams({
        customer_key: customerKey,
        page: String(page),
        limit: String(limit),
    });

    const response = await apiFetch<{ data: CustomerGroupPaymentsResponse }>(
        `/api/admin/customers/group-payments?${query.toString()}`
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
    failed_targets?: Array<{
        source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
        id: number;
        failed_channels: Array<"WHATSAPP" | "EMAIL">;
    }>;
}

export interface MassCustomerMessageProgress extends MassCustomerMessageResult {
    processed: number;
    total_recipients: number;
}

export type GroupEventMassMessageTarget = {
    source: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
    id: number;
};

export type GroupEventMassMessageDeliveryMode = "WHATSAPP" | "EMAIL" | "BOTH";

export type GroupEventMassMessagePayload = {
    message: string;
    delivery_mode?: GroupEventMassMessageDeliveryMode;
    selected_targets?: GroupEventMassMessageTarget[];
};

export type GroupClassMassMessagePayload = {
    message: string;
    delivery_mode?: GroupEventMassMessageDeliveryMode;
    selected_targets?: Array<{ id: number }>;
};

export async function importCustomersFile(file: File): Promise<CustomerImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(resolveBackendUrl("/api/admin/customers/import"), {
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
    segment?: CustomerSegmentKey;
}): Promise<MassCustomerMessageResult> {
    const response = await apiFetch<{ data: MassCustomerMessageResult }>("/api/admin/customers/mass-message", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function downloadCustomerImportTemplate(): Promise<Blob> {
    const response = await fetch(resolveBackendUrl("/api/admin/customers/import/template"), {
        credentials: "include",
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.blob();
}

export async function downloadCustomersExport(params?: {
    search?: string;
    segment?: CustomerSegmentKey;
}): Promise<{ blob: Blob; fileName: string | null }> {
    const query = new URLSearchParams();
    if (params?.search) {
        query.set("search", params.search);
    }
    if (params?.segment && params.segment !== "ALL") {
        query.set("segment", params.segment);
    }

    const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";
    const response = await fetch(resolveBackendUrl(`/api/admin/customers/export${suffix}`), {
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
    session_slots?: Array<{ start_at: string }>;
    customer_id?: number;
    customer: {
        full_name: string;
        email?: string;
        phoneNumber?: string;
        phonePrefix?: string;
    };
    notes?: string;
    is_paid?: boolean;
    payment_method?: "NONE" | "CASH" | "QR";
    qr_proof_image_url?: string | null;
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

export interface RecurringBookingSessionData {
    service_ids: number[];
    start_at: string;
    is_paid?: boolean;
    payment_method?: "NONE" | "CASH" | "QR";
    qr_proof_image_url?: string | null;
}

export interface CreateRecurringBookingData {
    staff_id: number;
    customer_id?: number;
    customer: {
        full_name: string;
        email?: string;
        phoneNumber?: string;
        phonePrefix?: string;
    };
    notes?: string;
    sessions: RecurringBookingSessionData[];
}

export async function createRecurringBookings(data: CreateRecurringBookingData): Promise<AdminBooking[]> {
    const response = await apiFetch<{ data: AdminBooking[] }>("/api/admin/bookings/batch", {
        method: "POST",
        body: JSON.stringify(data),
    });
    return response.data;
}

export async function uploadAdminQrProof(file: File, companyId: number): Promise<string> {
    return uploadAdminImage({ file, companyId, type: "restaurant_deposit_qr" });
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

export interface BookingRescheduleSuggestion {
    date: string;
    time: string;
    start_at: string;
    end_at: string;
}

export interface BookingRescheduleOptions {
    timezone: string;
    duration_minutes: number;
    current_start_at: string;
    current_end_at: string;
    suggestions: BookingRescheduleSuggestion[];
}

export interface RescheduleBookingResponse {
    booking: AdminBooking;
    audit_log_id: number;
    notification_attempts: {
        total: number;
        queued: number;
    };
}

export async function getBookingRescheduleOptions(
    bookingId: number,
    params?: { date?: string },
): Promise<BookingRescheduleOptions> {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    const suffix = query.toString().length > 0 ? `?${query.toString()}` : "";
    const response = await apiFetch<{ data: BookingRescheduleOptions }>(
        `/api/admin/bookings/${bookingId}/reschedule-options${suffix}`,
    );
    return response.data;
}

export async function rescheduleBooking(
    bookingId: number,
    data: { start_at: string; confirm_short_notice?: boolean },
): Promise<RescheduleBookingResponse> {
    const response = await apiFetch<{ data: RescheduleBookingResponse }>(
        `/api/admin/bookings/${bookingId}/reschedule`,
        {
            method: "POST",
            body: JSON.stringify(data),
        },
    );
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
    resource_type?: "PERSON" | "ROOM" | "EQUIPMENT";
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    start_date?: string | null;
    end_date?: string | null;
    company_id?: number;
    user_id?: string;
    user?: {
        id: string;
        email: string | null;
        name: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phoneNumber?: string | null;
        phone_prefix?: string | null;
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
    services?: number[];
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
    phoneNumber?: string;
    phonePrefix?: string;
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
    phoneNumber?: string;
    phonePrefix?: string;
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

export async function getStaffById(staffId: number): Promise<StaffMember> {
    const response = await apiFetch<{ data: StaffMember }>(`/api/admin/staff/${staffId}`);
    return response.data;
}

export interface SaveStaffPayload {
    email?: string;
    role?: "OWNER" | "ADMIN" | "STAFF";
    phonePrefix?: string;
    phoneNumber?: string;
    display_name: string;
    bio?: string;
    image_url?: string;
    is_bookable?: boolean;
    resource_type?: "PERSON" | "ROOM" | "EQUIPMENT";
    service_ids?: number[];
    start_date?: string;
    end_date?: string;
    company_id?: number;
}

export async function createStaffMember(payload: SaveStaffPayload): Promise<StaffMember> {
    const response = await apiFetch<{ data: StaffMember }>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function updateStaffMember(staffId: number, payload: Partial<SaveStaffPayload>): Promise<StaffMember> {
    const response = await apiFetch<{ data: StaffMember }>(`/api/admin/staff/${staffId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function updateStaffMemberServices(staffId: number, serviceIds: number[]): Promise<void> {
    await apiFetch(`/api/admin/staff/${staffId}/services`, {
        method: "PUT",
        body: JSON.stringify({ service_ids: serviceIds }),
    });
}

export async function resendStaffInvite(staffId: number): Promise<void> {
    await apiFetch(`/api/admin/staff/${staffId}/resend-invite`, {
        method: "POST",
    });
}

export async function deleteStaffMember(staffId: number): Promise<void> {
    await apiFetch(`/api/admin/staff/${staffId}`, {
        method: "DELETE",
    });
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
    is_multi_session?: boolean;
    session_count?: number | null;
    session_duration_minutes?: number | null;
    price_cents: number;
    promo_price_cents?: number | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
    promo_label?: string | null;
    pricing?: {
        regular_price_cents?: number | null;
        base_price_cents: number;
        final_price_cents: number;
        promo_applied: boolean;
        promo_label?: string | null;
        promo_starts_at?: string | null;
        promo_ends_at?: string | null;
    };
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

export async function assignStaffAvailabilityFromStoreHours(
    staffId: number,
    overwrite = false,
): Promise<StaffAvailabilityData> {
    const response = await apiFetch<{ data: StaffAvailabilityData }>(
        `/api/admin/staff/${staffId}/availability/from-company-hours`,
        {
            method: "POST",
            body: JSON.stringify({ overwrite }),
        },
    );
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

// ============ GROUP RESERVATIONS ============

export type GroupItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type GroupBookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";
export type GroupPaymentMethod = "NONE" | "CASH" | "QR";
export type GroupPaymentStatus = "UNPAID" | "PENDING_CONFIRMATION" | "PAID" | "REJECTED";
export type GroupPricingMode = "PER_SESSION" | "WEEKLY_PASS" | "MONTHLY_PASS" | "FULL_COURSE";
export type GroupRecurrenceType = "WEEKLY" | "MONTHLY" | "CUSTOM";
export type GroupStaffRole = "INSTRUCTOR" | "ASSISTANT";
export type GroupTicketStatus = "ACTIVE" | "USED" | "CANCELLED" | "EXPIRED";
export type GroupCheckInMethod = "QR_SCAN" | "MANUAL" | "PUBLIC_LINK";
export type GroupEnrollmentSource = "PUBLIC_CHECKOUT" | "ADMIN_CREATE" | "PUBLIC_ATTENDANCE_LINK";

export interface GroupStaffAssignment {
    id: number;
    company_id: number;
    group_event_id: number | null;
    group_class_id: number | null;
    staff_profile_id: number | null;
    display_name: string | null;
    display_phone: string | null;
    role: GroupStaffRole;
    created_at: string;
    updated_at: string;
    staff_profile?: {
        id: number;
        display_name: string;
        image_url: string | null;
    } | null;
}

export interface GroupEvent {
    id: number;
    company_id: number;
    title: string;
    slug: string;
    description: string | null;
    no_availability_message: string | null;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    status: GroupItemStatus;
    is_free: boolean;
    price_cents: number;
    max_capacity: number;
    capacity_visible: boolean;
    start_at: string;
    end_at: string;
    location_text: string | null;
    created_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    staff_assignments?: GroupStaffAssignment[];
    _count?: {
        bookings?: number;
        interests?: number;
    };
    booked_spots_confirmed?: number;
    booked_spots_pending?: number;
}

export interface GroupClassSession {
    id: number;
    company_id: number;
    group_class_id: number;
    start_at: string;
    end_at: string;
    status: GroupItemStatus;
    max_capacity_override: number | null;
    public_attendance_enabled: boolean;
    attendance_public_token: string | null;
    attendance_public_token_created_at: string | null;
    attendance_public_token_rotated_at: string | null;
    attendance_access_code_enabled: boolean;
    attendance_access_code_updated_at: string | null;
    attendance_access_code_configured?: boolean;
    cancelled_at: string | null;
    cancel_reason: string | null;
    created_at: string;
    updated_at: string;
    max_capacity?: number;
    booked_count?: number;
    attendance_count?: number;
    _count?: {
        attendances?: number;
    };
    group_class?: {
        id: number;
        title: string;
        pricing_mode: GroupPricingMode;
        price_cents: number;
        max_capacity_per_session: number;
    };
}

export interface GroupClass {
    id: number;
    company_id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    status: GroupItemStatus;
    pricing_mode: GroupPricingMode;
    price_cents: number;
    max_capacity_per_session: number;
    capacity_visible: boolean;
    session_duration_minutes: number;
    recurrence_type: GroupRecurrenceType;
    recurrence_config: Record<string, unknown>;
    recurrence_start_date: string;
    recurrence_end_date: string | null;
    start_time: string;
    location_text: string | null;
    created_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    staff_assignments?: GroupStaffAssignment[];
    sessions?: GroupClassSession[];
    _count?: {
        sessions?: number;
        enrollments?: number;
    };
}

export interface GroupEventBooking {
    id: number;
    source?: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
    company_id: number;
    group_event_id: number;
    customer_profile_id: number | null;
    user_id: string;
    status: GroupBookingStatus;
    booked_spots: number;
    payment_method: GroupPaymentMethod;
    payment_status: GroupPaymentStatus;
    qr_proof_image_url: string | null;
    total_price_cents: number;
    extra_attendees_json?: Array<{
        full_name: string;
        email?: string | null;
        phone?: string | null;
    }> | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    cancelled_at: string | null;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        phoneNumber: string | null;
    };
}

export interface GroupEventInterest {
    id: number;
    company_id: number;
    group_event_id: number;
    user_id: string;
    customer_profile_id: number | null;
    created_at: string;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        phoneNumber: string | null;
        phone_prefix?: string | null;
    };
}

export interface GroupClassEnrollment {
    id: number;
    company_id: number;
    group_class_id: number;
    customer_profile_id: number | null;
    customer_key?: string;
    user_id: string;
    pricing_mode: GroupPricingMode;
    price_cents_snapshot: number;
    status: GroupBookingStatus;
    payment_method: GroupPaymentMethod;
    payment_status: GroupPaymentStatus;
    qr_proof_image_url: string | null;
    source?: GroupEnrollmentSource;
    is_admin_sponsored?: boolean;
    sponsorship_reason?: string | null;
    sponsored_by_group_class_session_id?: number | null;
    sponsored_by_admin_user_id?: string | null;
    valid_from: string;
    valid_until: string;
    created_at: string;
    updated_at: string;
    cancelled_at: string | null;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        phoneNumber: string | null;
        phone_prefix?: string | null;
    };
}

export interface GroupEnrollmentInstallment {
    id: number;
    enrollment_id: number;
    installment_number: number;
    due_date: string;
    amount_cents: number;
    payment_status: GroupPaymentStatus;
    payment_method: GroupPaymentMethod;
    qr_proof_image_url: string | null;
    paid_at: string | null;
    marked_paid_by_admin_id: string | null;
    marked_paid_by_admin?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
    created_at: string;
    updated_at: string;
    derived_status?: GroupPaymentStatus | "OVERDUE";
    is_overdue?: boolean;
    last_reminder_at?: string | null;
    last_reminder_channel?: "WHATSAPP" | "EMAIL" | null;
    reminder_logs?: InstallmentReminderLogRow[];
}

export interface UpdateGroupEnrollmentInstallmentInput {
    id?: number;
    due_date: string;
    amount_cents: number;
    payment_status: GroupPaymentStatus;
    payment_method: GroupPaymentMethod;
}

export interface UpdateSessionPublicAttendancePayload {
    public_attendance_enabled?: boolean;
    attendance_access_code_enabled: boolean;
    attendance_access_code?: string | null;
}

export interface GroupInstallmentPlanSummary {
    total_installments: number;
    paid_count: number;
    pending_count: number;
    overdue_count: number;
    next_due_date: string | null;
    current_month_status: GroupPaymentStatus | "OVERDUE" | null;
    total_amount_cents: number;
    paid_amount_cents: number;
}

export interface GroupEnrollmentInstallmentPlan {
    enrollment: GroupClassEnrollment & {
        company?: {
            id: number;
            name: string;
            slug: string;
            currency: string;
        } | null;
        user?: {
            id: string;
            name: string | null;
            email: string | null;
            phoneNumber: string | null;
            phone_prefix?: string | null;
        } | null;
        group_class?: {
            id: number;
            title: string;
            slug: string;
            pricing_mode: GroupPricingMode;
            cover_image_url?: string | null;
            thumbnail_url?: string | null;
            recurrence_end_date?: string | null;
            location_text?: string | null;
        } | null;
    };
    installments: GroupEnrollmentInstallment[];
    summary: GroupInstallmentPlanSummary;
}

export interface AdminGroupPaymentRow {
    id: string;
    row_type: "EVENT_PAYMENT" | "CLASS_PAYMENT" | "INSTALLMENT";
    item_id: number;
    item_title: string;
    class_id: number | null;
    event_id: number | null;
    class_slug: string | null;
    event_slug: string | null;
    enrollment_id: number | null;
    event_booking_id: number | null;
    installment_id: number | null;
    installment_number: number | null;
    customer_key: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    customer_phone_prefix: string | null;
    user_id: string | null;
    amount_cents: number;
    due_date: string | null;
    paid_at: string | null;
    payment_method: GroupPaymentMethod;
    payment_status: GroupPaymentStatus;
    booking_status: GroupBookingStatus | null;
    qr_proof_image_url: string | null;
    created_at: string;
    last_reminder_at: string | null;
    last_reminder_channel: "WHATSAPP" | "EMAIL" | null;
    is_overdue: boolean;
}

export interface GroupPaymentsSummary {
    total_rows: number;
    unpaid_total_cents: number;
    overdue_installments: number;
    qr_pending_confirmations: number;
    paid_this_month_cents: number;
}

export interface GroupPaymentsLedgerResponse {
    rows: AdminGroupPaymentRow[];
    summary: GroupPaymentsSummary;
    pagination: CustomerHistoryResponse["pagination"];
    currency: string | null;
}

export interface GroupAttendanceRow {
    id: number;
    company_id: number;
    group_class_session_id: number | null;
    group_event_id: number | null;
    customer_profile_id: number | null;
    user_id: string;
    enrollment_id: number | null;
    event_booking_id: number | null;
    checked_in_at: string | null;
    checked_in_method: GroupCheckInMethod | null;
    created_at: string;
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        phoneNumber: string | null;
    };
    event_booking?: {
        id: number;
        status: GroupBookingStatus;
        payment_status: GroupPaymentStatus;
    };
    enrollment?: {
        id: number;
        status: GroupBookingStatus;
        valid_from: string;
        valid_until: string;
    };
}

export interface GroupTicket {
    id: number;
    company_id: number;
    group_event_booking_id: number | null;
    group_class_enrollment_id: number | null;
    group_class_session_id: number | null;
    ticket_code: string;
    seat_number?: number | null;
    holder_name?: string | null;
    holder_email?: string | null;
    holder_phone?: string | null;
    status: GroupTicketStatus;
    valid_from: string;
    valid_until: string;
    issued_at: string;
    used_at: string | null;
    cancelled_at: string | null;
    delivery_count?: number;
    resend_count?: number;
    last_sent_at?: string | null;
    qr_token?: string;
    qr_image_url?: string;
    created_at: string;
    updated_at: string;
    event_booking?: {
        id: number;
        user?: {
            id: string;
            name: string | null;
            email: string | null;
            phoneNumber: string | null;
        };
        group_event?: {
            id: number;
            title: string;
        };
    } | null;
    class_enrollment?: {
        id: number;
        user?: {
            id: string;
            name: string | null;
            email: string | null;
            phoneNumber: string | null;
        };
        group_class?: {
            id: number;
            title: string;
        };
    } | null;
}

export type GroupTicketScanStatus = "VALID" | "ALREADY_USED" | "INVALID";

export interface GroupTicketScanResult {
    scan_status: GroupTicketScanStatus;
    reason?: string;
    ticket_code?: string;
    ticket_type?: "EVENT" | "CLASS";
    class_session_id?: number;
    attendance?: GroupAttendanceRow;
    ticket?: GroupTicket;
}

export interface GroupAttendanceSummary {
    total_rows: number;
    event_checked_in: number;
    class_checked_in: number;
}

export interface GroupEventMetricsSummary {
    total_events: number;
    seats_sold: number;
    occupancy_rate: number;
    attendance_rate: number;
    no_show_count: number;
    free_confirmed_spots: number;
    paid_confirmed_spots: number;
    revenue_cents: number;
    total_interest_count?: number;
    waitlist_size?: number;
}

export interface GroupEventMetricsRow {
    event_id: number;
    title: string;
    status: GroupItemStatus;
    is_free: boolean;
    start_at: string;
    end_at: string;
    max_capacity: number;
    confirmed_spots: number;
    pending_spots: number;
    waitlist_size: number;
    interest_count: number;
    checked_in_count: number;
    occupancy_rate: number;
    attendance_rate: number;
    no_show_count: number;
    revenue_cents: number;
}

export interface GroupClassSessionMetricsRow {
    session_id: number;
    start_at: string;
    end_at: string;
    capacity: number;
    potential_attendances: number;
    checked_in_count: number;
    no_show_count: number;
    occupancy_rate: number;
    pass_utilization_rate: number;
}

export interface GroupClassMetricsRow {
    class_id: number;
    title: string;
    status: GroupItemStatus;
    pricing_mode: GroupPricingMode;
    total_sessions: number;
    total_enrollments: number;
    confirmed_enrollments: number;
    pending_enrollments: number;
    active_pass_holders: number;
    revenue_cents: number;
    checked_in_count: number;
    no_show_count: number;
    occupancy_rate: number;
    attendance_rate: number;
    pass_utilization_rate: number;
    session_breakdown: GroupClassSessionMetricsRow[];
}

export interface GroupClassMetricsSummary {
    total_classes: number;
    total_sessions: number;
    total_enrollments: number;
    active_pass_holders: number;
    revenue_cents: number;
    checked_in_count: number;
    no_show_count: number;
    occupancy_rate: number;
    attendance_rate: number;
    pass_utilization_rate: number;
}

export interface GroupMetricsResponse {
    scope: "BUSINESS" | "PRO";
    filters: {
        date_from: string | null;
        date_to: string | null;
        event_id: number | null;
        class_id: number | null;
        item_status: GroupItemStatus | null;
        booking_status: GroupBookingStatus | null;
        free_paid: "FREE" | "PAID" | null;
    };
    events: {
        summary: GroupEventMetricsSummary;
        breakdown: GroupEventMetricsRow[];
    };
    classes: null | {
        summary: GroupClassMetricsSummary;
        breakdown: GroupClassMetricsRow[];
    };
    advanced?: {
        waitlist_size: number;
    };
}

export interface GroupBookingFlowSettings {
    auto_confirm_bookings: boolean;
    allow_qr_payment: boolean;
    allow_cash_payment: boolean;
    require_comprobante_for_qr: boolean;
}

export interface TimeOffApprovalSettings {
    auto_approve_staff_time_off: boolean;
}

export interface AdminCompanyLocation {
    address: string | null;
    city: string | null;
    state: string | null;
    latitude: number | null;
    longitude: number | null;
}

export interface GroupStaffAssignmentInput {
    staff_profile_id?: number | null;
    display_name?: string | null;
    display_phone?: string | null;
    role?: GroupStaffRole;
}

export interface CreateGroupEventPayload {
    title: string;
    slug?: string;
    description?: string | null;
    no_availability_message?: string | null;
    cover_image_url?: string | null;
    thumbnail_url?: string | null;
    status?: GroupItemStatus;
    is_free: boolean;
    price_cents: number;
    max_capacity: number;
    capacity_visible?: boolean;
    start_at: string;
    end_at: string;
    location_text?: string | null;
    staff_assignments?: GroupStaffAssignmentInput[];
}

export type UpdateGroupEventPayload = Partial<CreateGroupEventPayload>;

export interface CreateGroupClassPayload {
    title: string;
    slug?: string;
    description?: string | null;
    cover_image_url?: string | null;
    thumbnail_url?: string | null;
    status?: GroupItemStatus;
    pricing_mode: GroupPricingMode;
    price_cents: number;
    max_capacity_per_session: number;
    capacity_visible?: boolean;
    session_duration_minutes: number;
    recurrence_type: GroupRecurrenceType;
    recurrence_config: Record<string, unknown>;
    recurrence_start_date: string;
    recurrence_end_date?: string | null;
    start_time: string;
    location_text?: string | null;
    staff_assignments?: GroupStaffAssignmentInput[];
}

export type UpdateGroupClassPayload = Partial<CreateGroupClassPayload>;

function buildGroupQuery(params: Record<string, string | number | boolean | undefined | null>): string {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        search.set(key, String(value));
    });

    const query = search.toString();
    return query ? `?${query}` : "";
}

export async function getGroupBookingFlowSettings(): Promise<GroupBookingFlowSettings> {
    const response = await apiFetch<{ data: GroupBookingFlowSettings }>("/api/admin/settings");
    return response.data;
}

export async function getTimeOffApprovalSettings(): Promise<TimeOffApprovalSettings> {
    const response = await apiFetch<{ data: TimeOffApprovalSettings }>("/api/admin/settings");
    return {
        auto_approve_staff_time_off: response.data.auto_approve_staff_time_off ?? false,
    };
}

export async function updateTimeOffApprovalSettings(
    payload: TimeOffApprovalSettings,
): Promise<TimeOffApprovalSettings> {
    const response = await apiFetch<{ data: TimeOffApprovalSettings }>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return {
        auto_approve_staff_time_off: response.data.auto_approve_staff_time_off ?? false,
    };
}

export async function getAdminCompanyLocation(companyId: number): Promise<AdminCompanyLocation | null> {
    if (!Number.isInteger(companyId) || companyId <= 0) return null;

    const response = await apiFetch<{ data?: Record<string, unknown> }>(`/api/company/id/${companyId}`);
    const source = (response?.data ?? response) as Record<string, unknown>;

    const latitudeValue = source.latitude;
    const longitudeValue = source.longitude;

    const latitude = typeof latitudeValue === "number"
        ? latitudeValue
        : typeof latitudeValue === "string" && latitudeValue.trim().length > 0
            ? Number.parseFloat(latitudeValue)
            : null;

    const longitude = typeof longitudeValue === "number"
        ? longitudeValue
        : typeof longitudeValue === "string" && longitudeValue.trim().length > 0
            ? Number.parseFloat(longitudeValue)
            : null;

    return {
        address: typeof source.address === "string" ? source.address : null,
        city: typeof source.city === "string" ? source.city : null,
        state: typeof source.state === "string" ? source.state : null,
        latitude: Number.isFinite(latitude ?? NaN) ? latitude : null,
        longitude: Number.isFinite(longitude ?? NaN) ? longitude : null,
    };
}

export async function listGroupEvents(params?: {
    status?: GroupItemStatus;
    upcoming?: boolean;
}): Promise<GroupEvent[]> {
    const query = buildGroupQuery({
        status: params?.status,
        upcoming: params?.upcoming,
    });
    const response = await apiFetch<{ data: GroupEvent[] }>(`/api/admin/group/events${query}`);
    return response.data;
}

export async function getGroupEventById(eventId: number): Promise<GroupEvent> {
    const response = await apiFetch<{ data: GroupEvent }>(`/api/admin/group/events/${eventId}`);
    return response.data;
}

export async function createGroupEvent(payload: CreateGroupEventPayload): Promise<GroupEvent> {
    const response = await apiFetch<{ data: GroupEvent }>("/api/admin/group/events", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function updateGroupEvent(eventId: number, payload: UpdateGroupEventPayload): Promise<GroupEvent> {
    const response = await apiFetch<{ data: GroupEvent }>(`/api/admin/group/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function setGroupEventStatus(eventId: number, status: GroupItemStatus): Promise<void> {
    await apiFetch(`/api/admin/group/events/${eventId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
    });
}

export async function deleteGroupEvent(eventId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/${eventId}`, { method: "DELETE" });
}

export async function listGroupEventBookings(eventId: number): Promise<GroupEventBooking[]> {
    const response = await apiFetch<{ data: GroupEventBooking[] }>(`/api/admin/group/events/${eventId}/bookings`);
    return response.data;
}

export async function listGroupEventInterests(eventId: number): Promise<GroupEventInterest[]> {
    const response = await apiFetch<{ data: GroupEventInterest[] }>(`/api/admin/group/events/${eventId}/interests`);
    return response.data;
}

export async function listGroupEventAttendance(eventId: number): Promise<GroupAttendanceRow[]> {
    const response = await apiFetch<{ data: GroupAttendanceRow[] }>(`/api/admin/group/events/${eventId}/attendance`);
    return response.data;
}

export async function confirmGroupEventBooking(bookingId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/bookings/${bookingId}/confirm`, { method: "POST" });
}

export async function unconfirmGroupEventBooking(bookingId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/bookings/${bookingId}/unconfirm`, { method: "POST" });
}

export async function approveGroupEventBookingQrPayment(bookingId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/bookings/${bookingId}/approve-qr`, { method: "POST" });
}

export async function cancelGroupEventBooking(bookingId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/bookings/${bookingId}/cancel`, { method: "POST" });
}

export async function sendGroupEventMassMessage(
    eventId: number,
    payload: GroupEventMassMessagePayload,
): Promise<MassCustomerMessageResult> {
    const response = await apiFetch<{ data: MassCustomerMessageResult }>(
        `/api/admin/group/events/${eventId}/mass-message`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
    return response.data;
}

export async function sendGroupClassMassMessage(
    classId: number,
    payload: GroupClassMassMessagePayload,
): Promise<MassCustomerMessageResult> {
    const response = await apiFetch<{ data: MassCustomerMessageResult }>(
        `/api/admin/group/classes/${classId}/mass-message`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
    return response.data;
}

export async function streamGroupEventMassMessage(
    eventId: number,
    payload: GroupEventMassMessagePayload,
    options?: {
        onProgress?: (progress: MassCustomerMessageProgress) => void;
    },
): Promise<MassCustomerMessageResult> {
    const response = await fetch(resolveBackendUrl(`/api/admin/group/events/${eventId}/mass-message/stream`), {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const fallback = await response.json().catch(() => null);
        const message =
            (typeof fallback?.message === "string" && fallback.message) ||
            (typeof fallback?.error === "string" && fallback.error) ||
            `Request failed: ${response.status}`;
        throw new Error(message);
    }

    if (!response.body) {
        throw new Error("Mass message progress stream is not available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: MassCustomerMessageResult | null = null;

    const handleChunk = (chunk: string) => {
        const lines = chunk.split("\n");
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
            if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trimStart());
            }
        }

        if (dataLines.length === 0) return;

        const payloadData = JSON.parse(dataLines.join("\n")) as
            | MassCustomerMessageResult
            | MassCustomerMessageProgress
            | { message?: string };

        if (eventName === "progress") {
            options?.onProgress?.(payloadData as MassCustomerMessageProgress);
            return;
        }

        if (eventName === "complete") {
            finalResult = payloadData as MassCustomerMessageResult;
            return;
        }

        if (eventName === "error") {
            throw new Error(
                (payloadData as { message?: string }).message || "Mass message stream failed",
            );
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventChunk of events) {
            if (!eventChunk.trim()) continue;
            handleChunk(eventChunk);
        }

        if (done) {
            if (buffer.trim()) {
                handleChunk(buffer);
            }
            break;
        }
    }

    if (!finalResult) {
        throw new Error("Mass message completed without a final response");
    }

    return finalResult;
}

export async function listGroupClasses(params?: {
    status?: GroupItemStatus;
}): Promise<GroupClass[]> {
    const query = buildGroupQuery({
        status: params?.status,
    });
    const response = await apiFetch<{ data: GroupClass[] }>(`/api/admin/group/classes${query}`);
    return response.data;
}

export async function getGroupClassById(classId: number): Promise<GroupClass> {
    const response = await apiFetch<{ data: GroupClass }>(`/api/admin/group/classes/${classId}`);
    return response.data;
}

export async function createGroupClass(payload: CreateGroupClassPayload): Promise<GroupClass> {
    const response = await apiFetch<{ data: GroupClass }>("/api/admin/group/classes", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function updateGroupClass(classId: number, payload: UpdateGroupClassPayload): Promise<GroupClass> {
    const response = await apiFetch<{ data: GroupClass }>(`/api/admin/group/classes/${classId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function setGroupClassStatus(classId: number, status: GroupItemStatus): Promise<void> {
    await apiFetch(`/api/admin/group/classes/${classId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
    });
}

export async function deleteGroupClass(classId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/${classId}`, { method: "DELETE" });
}

export async function generateGroupClassSessions(classId: number): Promise<number> {
    const response = await apiFetch<{ data: { created: number } }>(`/api/admin/group/classes/${classId}/sessions/generate`, {
        method: "POST",
    });
    return response.data.created;
}

export async function listGroupClassSessions(classId: number, params?: {
    upcoming?: boolean;
    include_cancelled?: boolean;
}): Promise<GroupClassSession[]> {
    const query = buildGroupQuery({
        upcoming: params?.upcoming,
        include_cancelled: params?.include_cancelled,
    });
    const response = await apiFetch<{ data: GroupClassSession[] }>(`/api/admin/group/classes/${classId}/sessions${query}`);
    return response.data;
}

export async function getGroupClassSession(sessionId: number): Promise<GroupClassSession> {
    const response = await apiFetch<{ data: GroupClassSession }>(`/api/admin/group/classes/sessions/${sessionId}`);
    return response.data;
}

export async function cancelGroupClassSession(sessionId: number, reason?: string): Promise<void> {
    await apiFetch(`/api/admin/group/classes/sessions/${sessionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });
}

export async function getGroupClassSessionPublicAttendance(sessionId: number): Promise<GroupClassSession> {
    const response = await apiFetch<{ data: GroupClassSession }>(`/api/admin/group/classes/sessions/${sessionId}/public-attendance`);
    return response.data;
}

export async function updateGroupClassSessionPublicAttendance(
    sessionId: number,
    payload: UpdateSessionPublicAttendancePayload,
): Promise<GroupClassSession> {
    const response = await apiFetch<{ data: GroupClassSession }>(`/api/admin/group/classes/sessions/${sessionId}/public-attendance`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function rotateGroupClassSessionPublicAttendance(sessionId: number): Promise<GroupClassSession> {
    const response = await apiFetch<{ data: GroupClassSession }>(`/api/admin/group/classes/sessions/${sessionId}/public-attendance/rotate`, {
        method: "POST",
    });
    return response.data;
}

export async function listGroupClassEnrollments(classId: number): Promise<GroupClassEnrollment[]> {
    const response = await apiFetch<{ data: GroupClassEnrollment[] }>(`/api/admin/group/classes/${classId}/enrollments`);
    return response.data;
}

export async function adminCreateGroupClassEnrollment(
    classId: number,
    input: {
        customer_id?: number;
        new_member?: {
            name: string;
            email?: string;
            phone?: string;
            phone_prefix?: string;
            country_code?: string;
        };
        payment_method: "NONE" | "CASH" | "QR";
        mark_as_paid: boolean;
        qr_proof_image_url?: string | null;
    },
): Promise<GroupClassEnrollment> {
    const response = await apiFetch<{ data: GroupClassEnrollment }>(`/api/admin/group/classes/${classId}/enrollments`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return response.data;
}

export async function listGroupClassSessionAttendance(sessionId: number): Promise<GroupAttendanceRow[]> {
    const response = await apiFetch<{ data: GroupAttendanceRow[] }>(`/api/admin/group/classes/sessions/${sessionId}/attendance`);
    return response.data;
}

export async function confirmGroupClassEnrollment(enrollmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/confirm`, { method: "POST" });
}

export async function unconfirmGroupClassEnrollment(enrollmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/unconfirm`, { method: "POST" });
}

export async function cancelGroupClassEnrollment(enrollmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/cancel`, { method: "POST" });
}

export async function confirmGroupClassEnrollmentPayment(enrollmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/confirm-payment`, { method: "POST" });
}

export async function listGroupEnrollmentInstallments(enrollmentId: number): Promise<GroupEnrollmentInstallmentPlan> {
    const response = await apiFetch<{ data: GroupEnrollmentInstallmentPlan }>(`/api/admin/group/classes/enrollments/${enrollmentId}/installments`);
    return response.data;
}

export async function updateGroupEnrollmentInstallments(
    enrollmentId: number,
    installments: UpdateGroupEnrollmentInstallmentInput[],
): Promise<GroupEnrollmentInstallmentPlan> {
    const response = await apiFetch<{ data: GroupEnrollmentInstallmentPlan }>(
        `/api/admin/group/classes/enrollments/${enrollmentId}/installments`,
        {
            method: "PUT",
            body: JSON.stringify({ installments }),
        },
    );
    return response.data;
}

export async function markGroupEnrollmentInstallmentPaid(
    enrollmentId: number,
    installmentId: number,
    paymentMethod: Extract<GroupPaymentMethod, "CASH" | "QR">,
): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/installments/${installmentId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ payment_method: paymentMethod }),
    });
}

export async function confirmGroupEnrollmentInstallmentQr(enrollmentId: number, installmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/installments/${installmentId}/confirm-qr`, {
        method: "POST",
    });
}

export async function getGroupPayments(params?: {
    search?: string;
    customer_key?: string;
    class_id?: number;
    payment_status?: GroupPaymentStatus;
    payment_method?: GroupPaymentMethod;
    row_type?: "EVENT_PAYMENT" | "CLASS_PAYMENT" | "INSTALLMENT";
    due_window?: "TODAY" | "7_DAYS" | "30_DAYS" | "OVERDUE";
    overdue_only?: boolean;
    page?: number;
    limit?: number;
}): Promise<GroupPaymentsLedgerResponse> {
    const query = buildGroupQuery({
        search: params?.search,
        customer_key: params?.customer_key,
        class_id: params?.class_id,
        payment_status: params?.payment_status,
        payment_method: params?.payment_method,
        row_type: params?.row_type,
        due_window: params?.due_window,
        overdue_only: params?.overdue_only,
        page: params?.page,
        limit: params?.limit,
    });
    const response = await apiFetch<{ data: GroupPaymentsLedgerResponse }>(`/api/admin/group/payments${query}`);
    return response.data;
}

export async function sendGroupInstallmentReminder(installmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/installments/${installmentId}/reminders/send`, {
        method: "POST",
    });
}

export async function bulkSendGroupInstallmentReminders(payload: {
    installment_ids?: number[];
    overdue_only?: boolean;
    class_id?: number;
    customer_key?: string;
}): Promise<{
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    results: Array<{ installment_id: number; status: "sent" | "skipped" | "failed"; message: string }>;
}> {
    const response = await apiFetch<{ data: {
        total: number;
        sent: number;
        skipped: number;
        failed: number;
        results: Array<{ installment_id: number; status: "sent" | "skipped" | "failed"; message: string }>;
    } }>("/api/admin/group/installments/reminders/bulk-send", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function listGroupInstallmentReminders(installmentId: number): Promise<InstallmentReminderLogRow[]> {
    const response = await apiFetch<{ data: InstallmentReminderLogRow[] }>(`/api/admin/group/installments/${installmentId}/reminders`);
    return response.data;
}

export async function issueGroupClassEnrollmentTicket(enrollmentId: number): Promise<void> {
    await apiFetch(`/api/admin/group/classes/enrollments/${enrollmentId}/issue-ticket`, { method: "POST" });
}

export async function adminResendGroupTicket(ticketCode: string): Promise<void> {
    await apiFetch(`/api/admin/group/tickets/${ticketCode}/resend`, { method: "POST" });
}

export async function getGroupAttendanceSummary(): Promise<GroupAttendanceSummary> {
    const response = await apiFetch<{ data: GroupAttendanceSummary }>("/api/admin/group/attendance/summary");
    return response.data;
}

export async function checkInGroupEventAttendee(eventId: number, userId: string, method: GroupCheckInMethod = "MANUAL"): Promise<GroupAttendanceRow> {
    const response = await apiFetch<{ data: GroupAttendanceRow }>(`/api/admin/group/attendance/events/${eventId}/check-in`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, method }),
    });
    return response.data;
}

export async function checkInGroupClassSessionAttendee(
    sessionId: number,
    userId: string,
    method: GroupCheckInMethod = "MANUAL",
): Promise<GroupAttendanceRow> {
    const response = await apiFetch<{ data: GroupAttendanceRow }>(`/api/admin/group/attendance/sessions/${sessionId}/check-in`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, method }),
    });
    return response.data;
}

export async function setGroupClassSessionAttendanceStatus(
    sessionId: number,
    input: {
        user_id: string;
        status: "SHOW" | "NO_SHOW";
        method?: GroupCheckInMethod;
    },
): Promise<GroupAttendanceRow> {
    const response = await apiFetch<{ data: GroupAttendanceRow }>(`/api/admin/group/attendance/sessions/${sessionId}/status`, {
        method: "POST",
        body: JSON.stringify(input),
    });
    return response.data;
}

export async function checkInGroupByTicketCode(payload: {
    ticket_code?: string;
    qr_token?: string;
    method?: GroupCheckInMethod;
    class_session_id?: number;
    event_id?: number;
}): Promise<GroupTicketScanResult> {
    const response = await apiFetch<{ data: GroupTicketScanResult }>("/api/admin/group/attendance/tickets/check-in", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.data;
}

export async function listGroupTickets(params?: {
    status?: GroupTicketStatus;
    event_booking_id?: number;
    class_enrollment_id?: number;
}): Promise<GroupTicket[]> {
    const query = buildGroupQuery({
        status: params?.status,
        event_booking_id: params?.event_booking_id,
        class_enrollment_id: params?.class_enrollment_id,
    });
    const response = await apiFetch<{ data: GroupTicket[] }>(`/api/admin/group/tickets${query}`);
    return response.data;
}

export async function getGroupTicketByCode(ticketCode: string): Promise<GroupTicket> {
    const response = await apiFetch<{ data: GroupTicket }>(`/api/admin/group/tickets/${encodeURIComponent(ticketCode)}`);
    return response.data;
}

export async function resendGroupTicket(ticketCode: string): Promise<void> {
    await apiFetch(`/api/admin/group/tickets/${encodeURIComponent(ticketCode)}/resend`, {
        method: "POST",
    });
}

export async function cancelGroupTicket(ticketCode: string): Promise<void> {
    await apiFetch(`/api/admin/group/tickets/${encodeURIComponent(ticketCode)}/cancel`, {
        method: "POST",
    });
}

export async function getGroupMetrics(params?: {
    date_from?: string;
    date_to?: string;
    event_id?: number;
    class_id?: number;
    item_status?: GroupItemStatus;
    booking_status?: GroupBookingStatus;
    free_paid?: "FREE" | "PAID";
}): Promise<GroupMetricsResponse> {
    const query = buildGroupQuery({
        date_from: params?.date_from,
        date_to: params?.date_to,
        event_id: params?.event_id,
        class_id: params?.class_id,
        item_status: params?.item_status,
        booking_status: params?.booking_status,
        free_paid: params?.free_paid,
    });
    const response = await apiFetch<{ data: GroupMetricsResponse }>(`/api/admin/group/metrics${query}`);
    return response.data;
}

// ─── Free event registration management ───────────────────────────────────────

export interface FreeEventRegistration {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phonePrefix: string;
    phoneNumber: string;
    gender: string;
    age: number;
    status: "CONFIRMED" | "PENDING";
    reservationCode: string | null;
    checkedInAt: string | null;
    createdAt: string;
}

export interface FreeEventInterestedUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phonePrefix: string;
    phoneNumber: string;
    gender: string;
    age: number;
    createdAt: string;
}

export async function listFreeEventRegistrations(eventId: number): Promise<FreeEventRegistration[]> {
    const response = await apiFetch<{ data: FreeEventRegistration[] }>(`/api/admin/group/events/${eventId}/free-registrations`);
    return response.data;
}

export async function removeFreeEventRegistration(eventId: number, registrationId: number): Promise<void> {
    await apiFetch(`/api/admin/group/events/${eventId}/free-registrations/${registrationId}`, { method: "DELETE" });
}

export async function listFreeEventInterested(eventId: number): Promise<FreeEventInterestedUser[]> {
    const response = await apiFetch<{ data: FreeEventInterestedUser[] }>(`/api/admin/group/events/${eventId}/free-registrations/interested`);
    return response.data;
}

export async function inviteFreeEventInterested(
    eventId: number,
    registrationId: number,
    channels: { email: boolean; whatsapp: boolean },
): Promise<{ id: number; status: string; reservationCode: string }> {
    const response = await apiFetch<{ data: { id: number; status: string; reservationCode: string } }>(
        `/api/admin/group/events/${eventId}/free-registrations/${registrationId}/invite`,
        { method: "POST", body: JSON.stringify(channels) },
    );
    return response.data;
}

// ─── WhatsApp event groups ─────────────────────────────────────────────────────

export interface WhatsappEventGroup {
    id: number;
    group_event_id: number;
    group_jid: string;
    group_name: string;
    created_at: string;
}

export async function listWhatsappEventGroups(eventId: number): Promise<WhatsappEventGroup[]> {
    const response = await apiFetch<{ groups: WhatsappEventGroup[] }>(`/api/admin/group/events/${eventId}/whatsapp-groups`);
    return response.groups;
}

export async function createWhatsappEventGroup(
    eventId: number,
    payload: { groupName?: string; staffPhones?: string[]; includeParticipants?: boolean },
): Promise<WhatsappEventGroup> {
    const response = await apiFetch<{ group: WhatsappEventGroup }>(`/api/admin/group/events/${eventId}/whatsapp-groups`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return response.group;
}

export async function sendWhatsappGroupMessage(eventId: number, groupId: number, message: string): Promise<void> {
    await apiFetch(`/api/admin/group/events/${eventId}/whatsapp-groups/${groupId}/message`, {
        method: "POST",
        body: JSON.stringify({ message }),
    });
}

// ─── Restaurant Lite ─────────────────────────────────────────────────────────
export type RestaurantAccess = { entitled: boolean; enabled: boolean; plan: "STARTER" | "BUSINESS" | "PRO"; settings?: RestaurantSettings | null };
export type RestaurantSettings = { id: number; company_id: number; average_dining_minutes: number; slot_interval_minutes: number; minimum_advance_minutes: number; maximum_advance_days: number; auto_confirm_reservations: boolean; allow_customer_cancellation: boolean; cancellation_limit_minutes: number; minimum_party_size: number; maximum_party_size: number; require_phone: boolean; require_email: boolean; allow_walk_ins: boolean; deposit_enabled: boolean; deposit_amount_cents: number; deposit_mode: "PER_PERSON" | "PER_TABLE"; deposit_qr_image_url: string | null; turnover_buffer_minutes: number; cleanup_buffer_minutes: number; at_risk_warning_window_minutes: number; };
export type RestaurantDiningArea = { id: number; company_id: number; name: string; description: string | null; sort_order: number; is_active: boolean; };
export type RestaurantTable = { id: number; company_id: number; dining_area_id: number; name: string; minimum_seats: number; maximum_seats: number; sort_order: number; is_active: boolean; dining_area?: RestaurantDiningArea; };
export type RestaurantServicePeriod = { id: number; company_id: number; day_of_week: number; name: string | null; start_time: string; end_time: string; sort_order: number; is_active: boolean; };

async function restaurantRequest<T>(path: string, options?: RequestInit): Promise<T> { const response = await apiFetch<{ data: T }>(`/api/admin/restaurant${path}`, options); return response.data; }
export const getRestaurantAccess = () => restaurantRequest<RestaurantAccess>("/access");
export const updateRestaurantAccess = (enabled: boolean) => restaurantRequest<RestaurantAccess>("/access", { method: "PATCH", body: JSON.stringify({ enabled }) });
export const getRestaurantSettings = () => restaurantRequest<RestaurantSettings>("/settings");
export const updateRestaurantSettings = (input: Omit<RestaurantSettings, "id" | "company_id">) => restaurantRequest<RestaurantSettings>("/settings", { method: "PATCH", body: JSON.stringify(input) });
export const listRestaurantDiningAreas = () => restaurantRequest<RestaurantDiningArea[]>("/dining-areas");
export const createRestaurantDiningArea = (input: Partial<RestaurantDiningArea> & Pick<RestaurantDiningArea, "name">) => restaurantRequest<RestaurantDiningArea>("/dining-areas", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantDiningArea = (id: number, input: Partial<RestaurantDiningArea>) => restaurantRequest<RestaurantDiningArea>(`/dining-areas/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantDiningArea = (id: number) => restaurantRequest<null>(`/dining-areas/${id}`, { method: "DELETE" });
export const listRestaurantTables = () => restaurantRequest<RestaurantTable[]>("/tables");
export const createRestaurantTable = (input: Omit<RestaurantTable, "id" | "company_id" | "dining_area">) => restaurantRequest<RestaurantTable>("/tables", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantTable = (id: number, input: Partial<RestaurantTable>) => restaurantRequest<RestaurantTable>(`/tables/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantTable = (id: number) => restaurantRequest<null>(`/tables/${id}`, { method: "DELETE" });
export const listRestaurantServicePeriods = () => restaurantRequest<RestaurantServicePeriod[]>("/service-periods");
export const createRestaurantServicePeriod = (input: Omit<RestaurantServicePeriod, "id" | "company_id">) => restaurantRequest<RestaurantServicePeriod>("/service-periods", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantServicePeriod = (id: number, input: Partial<RestaurantServicePeriod>) => restaurantRequest<RestaurantServicePeriod>(`/service-periods/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantServicePeriod = (id: number) => restaurantRequest<null>(`/service-periods/${id}`, { method: "DELETE" });

export type RestaurantDietaryLabel = "VEGETARIAN" | "VEGAN" | "GLUTEN_FREE" | "SPICY" | "DAIRY_FREE" | "NUT_FREE";
export type RestaurantAllergen = "GLUTEN" | "DAIRY" | "EGGS" | "PEANUTS" | "TREE_NUTS" | "SOY" | "FISH" | "SHELLFISH" | "SESAME";
export type RestaurantMenuCategory = { id: number; company_id: number; name: string; description: string | null; image_url: string | null; sort_order: number; is_active: boolean; _count?: { items: number } };
export type RestaurantMenuItem = { id: number; company_id: number; category_id: number; name: string; description: string | null; price: string | null; image_url: string | null; is_active: boolean; is_available: boolean; is_featured: boolean; sort_order: number; preparation_minutes: number | null; dietary_labels: RestaurantDietaryLabel[] | null; allergens: RestaurantAllergen[] | null; category?: RestaurantMenuCategory };
export type RestaurantMenuItemInput = { category_id: number; name: string; description?: string | null; price?: string | null; is_active?: boolean; is_available?: boolean; is_featured?: boolean; sort_order?: number; preparation_minutes?: number | null; dietary_labels?: RestaurantDietaryLabel[]; allergens?: RestaurantAllergen[] };
export const listRestaurantMenuCategories = () => restaurantRequest<RestaurantMenuCategory[]>("/menu/categories");
export const createRestaurantMenuCategory = (input: Pick<RestaurantMenuCategory, "name"> & Partial<RestaurantMenuCategory>) => restaurantRequest<RestaurantMenuCategory>("/menu/categories", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantMenuCategory = (id: number, input: Partial<RestaurantMenuCategory>) => restaurantRequest<RestaurantMenuCategory>(`/menu/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantMenuCategory = (id: number) => restaurantRequest<null>(`/menu/categories/${id}`, { method: "DELETE" });
export const reorderRestaurantMenuCategories = (items: Array<{ id: number; sortOrder: number }>) => restaurantRequest<null>("/menu/categories/reorder", { method: "PATCH", body: JSON.stringify({ items }) });
export const listRestaurantMenuItems = () => restaurantRequest<{ items: RestaurantMenuItem[] }>("/menu/items");
export const createRestaurantMenuItem = (input: RestaurantMenuItemInput) => restaurantRequest<RestaurantMenuItem>("/menu/items", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantMenuItem = (id: number, input: Partial<RestaurantMenuItemInput>) => restaurantRequest<RestaurantMenuItem>(`/menu/items/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantMenuItem = (id: number) => restaurantRequest<null>(`/menu/items/${id}`, { method: "DELETE" });
export const reorderRestaurantMenuItems = (items: Array<{ id: number; sortOrder: number }>) => restaurantRequest<null>("/menu/items/reorder", { method: "PATCH", body: JSON.stringify({ items }) });
async function restaurantMenuImage(id: number, kind: "items" | "categories", file?: File): Promise<string | null> { const response = await fetch(resolveBackendUrl(`/api/admin/restaurant/menu/${kind}/${id}/image`), { method: file ? "POST" : "DELETE", credentials: "include", body: file ? (() => { const data = new FormData(); data.append("file", file); return data; })() : undefined }); const payload = await response.json().catch(() => null); if (!response.ok) throw normalizeApiError(payload, response.status, "No pudimos actualizar la imagen."); return payload?.data?.imageUrl ?? null; }
export const uploadRestaurantMenuItemImage = (id: number, file: File) => restaurantMenuImage(id, "items", file);
export const deleteRestaurantMenuItemImage = (id: number) => restaurantMenuImage(id, "items");
export const uploadRestaurantMenuCategoryImage = (id: number, file: File) => restaurantMenuImage(id, "categories", file);
export const deleteRestaurantMenuCategoryImage = (id: number) => restaurantMenuImage(id, "categories");

export type RestaurantReservationStatus = "PENDING" | "CONFIRMED" | "ARRIVED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type RestaurantReservationSource = "ADMIN" | "PHONE" | "WHATSAPP" | "WALK_IN" | "ONLINE";
export type RestaurantReservation = { id: number; reservation_code: string; reservation_date: string; start_time: string; end_time: string; party_size: number; customer_name: string; customer_phone: string | null; customer_email: string | null; deposit_amount_cents: number; deposit_mode: "PER_PERSON" | "PER_TABLE" | null; deposit_proof_image_url: string | null; notes: string | null; internal_notes: string | null; status: RestaurantReservationStatus; source: RestaurantReservationSource; seated_at: string | null; completed_at: string | null; cancelled_at: string | null; cancellation_reason: string | null; created_at: string; updated_at: string; table: RestaurantTable | null; };
export type RestaurantDashboard = { date: string; summary: { reservations_today: number; guests_expected_today: number; pending: number; confirmed: number; arrived: number; seated: number; completed: number; cancelled: number; no_shows: number; available_tables: number; blocked_tables: number; }; upcoming_reservations: RestaurantReservation[]; tables: Array<RestaurantTable & { operational_status: "AVAILABLE" | "RESERVED" | "ARRIVED" | "SEATED" | "INACTIVE"; current_reservation: RestaurantReservation | null; next_reservation: RestaurantReservation | null; }> };
export const getRestaurantDashboard = () => restaurantRequest<RestaurantDashboard>("/dashboard");
export const listRestaurantReservations = (params: Record<string, string | number | undefined> = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return restaurantRequest<{ items: RestaurantReservation[]; pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean } }>(`/reservations${query.size ? `?${query}` : ""}`); };
export const getRestaurantReservation = (id: number) => restaurantRequest<RestaurantReservation>(`/reservations/${id}`);
export const createRestaurantReservation = (input: Record<string, unknown>) => restaurantRequest<RestaurantReservation>("/reservations", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantReservation = (id: number, input: Record<string, unknown>) => restaurantRequest<RestaurantReservation>(`/reservations/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const updateRestaurantReservationStatus = (id: number, status: RestaurantReservationStatus, reason?: string) => restaurantRequest<RestaurantReservation>(`/reservations/${id}/status`, { method: "POST", body: JSON.stringify({ status, reason }) });
export const assignRestaurantReservationTable = (id: number, table_id: number | null, auto_assign = false) => restaurantRequest<RestaurantReservation>(`/reservations/${id}/assign-table`, { method: "POST", body: JSON.stringify({ table_id, auto_assign }) });
export type RestaurantNotificationLog = { id: number; event: "RESTAURANT_RESERVATION_CREATED" | "RESTAURANT_RESERVATION_CONFIRMED" | "RESTAURANT_RESERVATION_UPDATED" | "RESTAURANT_RESERVATION_CANCELLED" | "RESTAURANT_RESERVATION_REMINDER"; channel: "EMAIL" | "WHATSAPP"; status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"; trigger: "AUTOMATIC" | "MANUAL"; recipient: string | null; error_message: string | null; sent_at: string | null; created_at: string; };
export const resendRestaurantReservationConfirmation = (id: number) => restaurantRequest<{ reservationId: number; results: Array<{ channel: "EMAIL" | "WHATSAPP"; status: "SENT" | "FAILED" | "SKIPPED"; reason?: string }> }>(`/reservations/${id}/resend-confirmation`, { method: "POST" });
export const listRestaurantNotificationHistory = (id: number) => restaurantRequest<RestaurantNotificationLog[]>(`/reservations/${id}/notifications`);
export type RestaurantMetrics = { range: { dateFrom: string; dateTo: string; timezone: string }; summary: { totalReservations: number; activeReservations: number; expectedGuests: number; servedGuests: number; cancelledReservations: number; noShowReservations: number; cancellationRate: number; noShowRate: number; averagePartySize: number; averageLeadTimeMinutes: number }; statusBreakdown: Array<{ status: RestaurantReservationStatus; count: number; guestCount: number }>; sourceBreakdown: Array<{ source: RestaurantReservationSource; reservationCount: number; guestCount: number; percentage: number }>; weekdayBreakdown: Array<{ weekday: number; reservationCount: number; guestCount: number }>; timeBreakdown: Array<{ time: string; reservationCount: number; guestCount: number }>; diningAreaBreakdown: Array<{ diningAreaId: number | null; name: string; reservationCount: number; guestCount: number; completedCount: number; cancellationCount: number; noShowCount: number }>; tableBreakdown: Array<{ tableId: number | null; name: string; reservationCount: number; completedCount: number; guestCount: number; noShowCount: number }>; busiestDate: { date: string; reservationCount: number; guestCount: number } | null; };
export const getRestaurantMetrics = (params: { dateFrom?: string; dateTo?: string } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)).map(([key, value]) => [key, String(value)])); return restaurantRequest<RestaurantMetrics>(`/metrics${query.size ? `?${query}` : ""}`); };

export type RestaurantShiftStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
export type RestaurantShiftMemberRole = "MANAGER" | "HOST" | "WAITER";
export type RestaurantShiftMember = { id: number; user_id: string; role: RestaurantShiftMemberRole; user: { id: string; name: string | null; first_name?: string | null; last_name?: string | null; email: string } };
export type RestaurantShift = { id: number; company_id: number; name: string; shift_date: string; start_at: string; end_at: string; timezone: string; status: RestaurantShiftStatus; service_period_id: number | null; notes: string | null; shift_manager_user_id: string | null; opened_at: string | null; closed_at: string | null; members: RestaurantShiftMember[]; dining_areas: Array<{ id: number; dining_area_id: number; dining_area: RestaurantDiningArea }>; table_assignments: Array<{ id: number; table_id: number; member_id: number; table: RestaurantTable; member: RestaurantShiftMember }>; _count?: { members: number; table_assignments: number; dining_areas: number }; };
export type RestaurantShiftTemplate = { id: number; name: string; start_time: string; end_time: string; timezone: string; notes: string | null; members: Array<{ user_id: string; role: RestaurantShiftMemberRole }>; dining_areas: Array<{ dining_area_id: number; dining_area?: RestaurantDiningArea }>; table_assignments: Array<{ table_id: number; user_id: string; table?: RestaurantTable }> };
export type RestaurantShiftInput = { name: string; shift_date: string; start_time: string; end_time: string; timezone?: string; service_period_id?: number | null; notes?: string | null; shift_manager_user_id?: string | null };
export const listRestaurantShifts = (params: { dateFrom?: string; dateTo?: string; status?: RestaurantShiftStatus } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)).map(([key, value]) => [key, String(value)])); return restaurantRequest<RestaurantShift[]>(`/shifts${query.size ? `?${query}` : ""}`); };
export const getRestaurantShift = (id: number) => restaurantRequest<RestaurantShift>(`/shifts/${id}`);
export const createRestaurantShift = (input: RestaurantShiftInput) => restaurantRequest<RestaurantShift>("/shifts", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantShift = (id: number, input: Partial<RestaurantShiftInput>) => restaurantRequest<RestaurantShift>(`/shifts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteRestaurantShift = (id: number) => restaurantRequest<null>(`/shifts/${id}`, { method: "DELETE" });
export const openRestaurantShift = (id: number) => restaurantRequest<RestaurantShift>(`/shifts/${id}/open`, { method: "POST" });
export const closeRestaurantShift = (id: number) => restaurantRequest<RestaurantShift>(`/shifts/${id}/close`, { method: "POST" });
export const cancelRestaurantShift = (id: number) => restaurantRequest<RestaurantShift>(`/shifts/${id}/cancel`, { method: "POST" });
export const copyRestaurantShift = (id: number, input: { shift_date: string; name?: string }) => restaurantRequest<RestaurantShift>(`/shifts/${id}/copy`, { method: "POST", body: JSON.stringify(input) });
export const saveRestaurantShiftTemplate = (id: number, name: string) => restaurantRequest<RestaurantShiftTemplate>(`/shifts/${id}/template`, { method: "POST", body: JSON.stringify({ name }) });
export const listRestaurantShiftTemplates = () => restaurantRequest<RestaurantShiftTemplate[]>("/shift-templates");
export const createRestaurantShiftFromTemplate = (input: { template_id: number; shift_date: string; name?: string; start_time?: string; end_time?: string; notes?: string | null; shift_manager_user_id?: string | null }) => restaurantRequest<RestaurantShift>("/shift-templates/use", { method: "POST", body: JSON.stringify(input) });
export const replaceRestaurantShiftMembers = (id: number, members: Array<{ user_id: string; role: RestaurantShiftMemberRole }>) => restaurantRequest<RestaurantShift>(`/shifts/${id}/members`, { method: "PUT", body: JSON.stringify({ members }) });
export const replaceRestaurantShiftDiningAreas = (id: number, dining_area_ids: number[]) => restaurantRequest<RestaurantShift>(`/shifts/${id}/dining-areas`, { method: "PUT", body: JSON.stringify({ dining_area_ids }) });
export const replaceRestaurantShiftAssignments = (id: number, assignments: Array<{ table_id: number; user_id: string }>) => restaurantRequest<RestaurantShift>(`/shifts/${id}/assignments`, { method: "PUT", body: JSON.stringify({ assignments }) });
export const replaceRestaurantShiftSetup = (id: number, input: { members: Array<{ user_id: string; role: RestaurantShiftMemberRole }>; dining_area_ids: number[]; assignments: Array<{ table_id: number; user_id: string }> }) => restaurantRequest<RestaurantShift>(`/shifts/${id}/setup`, { method: "PUT", body: JSON.stringify(input) });

export type RestaurantTableOperationalStatus = "AVAILABLE" | "RESERVED_SOON" | "RESERVED" | "ARRIVED" | "SEATED" | "BILL_REQUESTED" | "CLEANING" | "BLOCKED";
export type RestaurantFloorReservation = { id: number; reservation_code: string; customer_name: string; customer_phone: string | null; party_size: number; start_time: string; end_time: string; status: RestaurantReservationStatus; source: RestaurantReservationSource; notes: string | null; internal_notes: string | null; minutes_until_start: number; assigned_waiter: { id: string; name: string; role?: string } | null };
export type RestaurantFloorTable = { id: number; name: string; capacity: number; minimum_seats: number; is_active: boolean; dining_area: { id: number; name: string; is_active: boolean }; operational_status: RestaurantTableOperationalStatus; status_since: string | null; blocked: boolean; blocked_reason: string | null; assigned_waiter: { id: string; name: string; role?: string } | null; current_reservation: RestaurantFloorReservation | null; next_reservation: RestaurantFloorReservation | null; combined: { id: number; name: string; capacity: number; table_ids: number[] } | null; };
export type RestaurantAtRisk = { reservation: RestaurantFloorReservation; severity: "WARNING" | "URGENT" | "OVERDUE"; reason: string; affected_table_ids: number[]; current_reservation: RestaurantFloorReservation | null };
export type RestaurantFloor = { generated_at: string; at: string; settings: { average_dining_minutes: number; turnover_buffer_minutes: number; cleanup_buffer_minutes: number; at_risk_warning_window_minutes: number }; shift: { id: number; name: string; status: RestaurantShiftStatus; start_at: string; end_at: string; members: Array<{ id: string; name: string; role: RestaurantShiftMemberRole }> } | null; waitlist?: { waiting: number; notified: number; arrived: number; total: number }; dining_areas: Array<RestaurantDiningArea & { tables: RestaurantFloorTable[] }>; tables: RestaurantFloorTable[]; at_risk: RestaurantAtRisk[]; };
export type RestaurantAlternative = { candidate_type: "TABLE" | "COMBINATION"; table_id: number | null; combination_id: number | null; table_ids: number[]; tables: Array<{ id: number; name: string; capacity: number; dining_area: string }>; capacity: number; dining_area_id: number | null; dining_area: string | undefined; requires_combining: boolean; available_period: { start: string; end: string }; upcoming_reservation_impact: unknown; assigned_waiter: { id: string; name: string; role?: string } | null; same_area: boolean; rank_reasons: string[]; rank: number; };
export type RestaurantTableCombination = { id: number; name: string; dining_area_id: number | null; is_active: boolean; tables: Array<{ table_id: number; table: RestaurantTable }> };
export const getRestaurantFloor = (params: { at?: string; shiftId?: number } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])); return restaurantRequest<RestaurantFloor>(`/floor${query.size ? `?${query}` : ""}`); };
export const getRestaurantAlternatives = (reservationId: number, at?: string) => restaurantRequest<RestaurantAlternative[]>(`/floor/reservations/${reservationId}/alternatives${at ? `?at=${encodeURIComponent(at)}` : ""}`);
export const relocateRestaurantReservation = (reservationId: number, input: { table_id?: number; combination_id?: number; reason?: string; initiated_from_at_risk?: boolean }) => restaurantRequest<RestaurantFloor>(`/floor/reservations/${reservationId}/relocate`, { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantTableStatus = (tableId: number, status: RestaurantTableOperationalStatus, blocked_reason?: string | null) => restaurantRequest<{ id: number; table_id: number; status: RestaurantTableOperationalStatus }>(`/floor/tables/${tableId}/status`, { method: "POST", body: JSON.stringify({ status, blocked_reason }) });
export const listRestaurantTableCombinations = () => restaurantRequest<RestaurantTableCombination[]>("/combinations");
export const createRestaurantTableCombination = (input: { name: string; dining_area_id?: number | null; table_ids: number[]; is_active?: boolean }) => restaurantRequest<RestaurantTableCombination>("/combinations", { method: "POST", body: JSON.stringify(input) });
export const deleteRestaurantTableCombination = (id: number) => restaurantRequest<null>(`/combinations/${id}`, { method: "DELETE" });

export type RestaurantMyShift = { current_shift: RestaurantShift | null; floor: RestaurantFloor | null; upcoming_shifts: Array<RestaurantShift & { my_tables?: Array<{ table_id: number }> }> };
export const getRestaurantMyShift = () => restaurantRequest<RestaurantMyShift>("/my-shift");
export const getRestaurantMyShifts = () => restaurantRequest<{ current: RestaurantShift | null; upcoming: RestaurantShift[] }>("/my-shifts");
export const updateMyRestaurantTableStatus = (tableId: number, status: RestaurantTableOperationalStatus) => restaurantRequest<unknown>(`/my-floor/tables/${tableId}/status`, { method: "POST", body: JSON.stringify({ status }) });
export const updateMyRestaurantReservationStatus = (reservationId: number, status: "ARRIVED" | "SEATED") => restaurantRequest<RestaurantFloorReservation>(`/my-floor/reservations/${reservationId}/status`, { method: "POST", body: JSON.stringify({ status }) });
export const addMyRestaurantInternalNote = (input: { note: string; table_id?: number; reservation_id?: number }) => restaurantRequest<unknown>("/my-floor/notes", { method: "POST", body: JSON.stringify(input) });

export type RestaurantVisitStatus = "DRAFT" | "CLOSED" | "REOPENED";
export type RestaurantVisitPaymentMethod = "CASH" | "CARD" | "QR" | "TRANSFER" | "MIXED" | "OTHER";
export type RestaurantVisit = { id: number; reservation_id: number | null; shift_id: number | null; table_id: number | null; primary_waiter_user_id: string | null; primary_waiter_name: string | null; guest_count: number; subtotal_amount_cents: number; discount_amount_cents: number; tip_amount_cents: number; total_paid_amount_cents: number; currency: string; payment_method: RestaurantVisitPaymentMethod; mixed_payment_breakdown: Record<string, number> | null; pos_reference: string | null; closing_notes: string | null; status: RestaurantVisitStatus; closed_at: string | null; reservation?: Pick<RestaurantReservation, "id" | "reservation_code" | "customer_name" | "party_size" | "source"> | null; };
export type RestaurantWaitlistStatus = "WAITING" | "NOTIFIED" | "ARRIVED" | "SEATED" | "LEFT" | "CANCELLED";
export type RestaurantWaitlist = { id: number; guest_name: string; phone: string | null; email: string | null; party_size: number; preferred_dining_area_id: number | null; estimated_wait_minutes: number; quoted_ready_at: string | null; actual_ready_at: string | null; notified_at: string | null; seated_at: string | null; status: RestaurantWaitlistStatus; priority: number; manual_order: number; internal_notes: string | null; preferred_dining_area?: RestaurantDiningArea | null; assigned_table?: RestaurantTable | null; assigned_combination?: { id: number; name: string } | null; };
export type RestaurantWaitlistInput = { guest_name: string; phone?: string | null; email?: string | null; customer_profile_id?: number | null; party_size: number; preferred_dining_area_id?: number | null; accessibility_notes?: string | null; seating_notes?: string | null; source?: "WALK_IN" | "PHONE" | "WHATSAPP" | "OTHER"; priority?: number; manual_order?: number; estimated_wait_minutes?: number; internal_notes?: string | null; };
export const listRestaurantWaitlist = (params: Record<string, string | number | undefined> = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return restaurantRequest<{ items: RestaurantWaitlist[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/waitlist${query.size ? `?${query}` : ""}`); };
export const addRestaurantWaitlist = (input: RestaurantWaitlistInput) => restaurantRequest<RestaurantWaitlist>("/waitlist", { method: "POST", body: JSON.stringify(input) });
export const updateRestaurantWaitlist = (id: number, input: Partial<RestaurantWaitlistInput> & { status?: RestaurantWaitlistStatus }) => restaurantRequest<RestaurantWaitlist>(`/waitlist/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const getRestaurantWaitlistRecommendations = (params: { table_id?: number; at?: string } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])); return restaurantRequest<Array<{ waitlist_id: number; recommended_table: RestaurantTable | null; recommended_combination: { id: number; name: string; capacity: number; table_ids: number[]; dining_area: string | null } | null; reasons: string[]; score: number }>>(`/waitlist/recommendations${query.size ? `?${query}` : ""}`); };
export const seatRestaurantWaitlist = (id: number, input: { table_id?: number | null; combination_id?: number | null }) => restaurantRequest<{ waitlist: RestaurantWaitlist; reservation: RestaurantReservation; visit: RestaurantVisit }>(`/waitlist/${id}/seat`, { method: "POST", body: JSON.stringify(input) });
export const listRestaurantVisits = (params: Record<string, string | number | undefined> = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return restaurantRequest<{ items: RestaurantVisit[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/visits${query.size ? `?${query}` : ""}`); };
export const saveRestaurantVisit = (input: Record<string, unknown>) => restaurantRequest<RestaurantVisit>("/visits", { method: "POST", body: JSON.stringify(input) });
export const reopenRestaurantVisit = (id: number, reason: string) => restaurantRequest<RestaurantVisit>(`/visits/${id}/reopen`, { method: "POST", body: JSON.stringify({ reason }) });
export type RestaurantFinancialMetrics = { totals: { visits: number; guests: number; subtotal_amount_cents: number; discount_amount_cents: number; tip_amount_cents: number; total_paid_amount_cents: number; average_spend_cents: number; average_guest_spend_cents: number }; missing_financial_capture_count?: number; by_date?: Array<Record<string, unknown>>; by_table?: Array<Record<string, unknown>>; by_payment_method: Array<Record<string, unknown>>; by_waiter: Array<Record<string, unknown>>; by_area: Array<Record<string, unknown>>; by_shift: Array<Record<string, unknown>>; by_source?: Array<Record<string, unknown>>; by_reservation_source?: Array<Record<string, unknown>>; };
export const getRestaurantFinancialMetrics = (params: { dateFrom?: string; dateTo?: string } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)).map(([key, value]) => [key, String(value)])); return restaurantRequest<RestaurantFinancialMetrics>(`/financial-metrics${query.size ? `?${query}` : ""}`); };

export type RestaurantDepositStatus = "REQUIRED" | "PENDING" | "PROOF_SUBMITTED" | "APPROVED" | "REJECTED" | "WAIVED" | "PARTIALLY_REFUNDED" | "REFUNDED" | "EXPIRED";
export type RestaurantDeposit = { id: number; status: RestaurantDepositStatus; requiredAmountCents: number; currency: string; mode: "PER_PERSON" | "PER_TABLE"; paymentMethod: string | null; paymentDeadline: string | null; proofSubmittedAt: string | null; reviewedAt: string | null; rejectionReason: string | null; approvedAt: string | null; refundedAmountCents: number; refundedAt: string | null; refundReason: string | null; hasProof: boolean; reservation: Pick<RestaurantReservation, "id" | "reservation_code" | "start_time" | "party_size" | "customer_name" | "customer_phone" | "status">; };
export const listRestaurantDeposits = (params: Record<string, string | number | undefined> = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return restaurantRequest<{ items: RestaurantDeposit[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/deposits${query.size ? `?${query}` : ""}`); };
export const reviewRestaurantDeposit = (id: number, input: { action: "APPROVE" | "REJECT" | "WAIVE" | "REFUND"; reason?: string; amountCents?: number; paymentMethod?: string | null }) => restaurantRequest<RestaurantDeposit>(`/deposits/${id}/review`, { method: "POST", body: JSON.stringify(input) });
export const sendRestaurantDepositReminder = (id: number) => restaurantRequest<{ reservationId: number; results: Array<{ channel: string; status: string; reason?: string }> }>(`/deposits/${id}/reminder`, { method: "POST" });
export const restaurantDepositProofUrl = (id: number) => resolveBackendUrl(`/api/admin/restaurant/deposits/${id}/proof`);
export async function fetchRestaurantDepositProof(id: number): Promise<string> {
  const response = await fetch(restaurantDepositProofUrl(id), { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw normalizeApiError(payload, response.status, "No pudimos abrir el comprobante.");
  }
  return URL.createObjectURL(await response.blob());
}

export type RestaurantCustomerHospitalityProfile = { id: number; customer_profile_id: number; vip: boolean; vip_level: string | null; birthday: string | null; anniversary: string | null; preferred_dining_area_id: number | null; preferred_table_id: number | null; preferred_waiter_user_id: string | null; seating_preference: string | null; accessibility_requirements: string | null; dietary_preferences: string | null; allergies: string | null; favorite_items: unknown; customer_facing_notes: string | null; internal_hospitality_notes: string | null; tags: unknown; last_visit_at: string | null; visit_count: number; no_show_count: number; cancellation_count: number; total_spend_cents: number; average_spend_cents: number; average_party_size: number | string; customer_profile?: { user?: { name?: string | null; email?: string | null; phoneNumber?: string | null } } };
export const listRestaurantCrmProfiles = (params: Record<string, string | number | boolean | undefined> = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])); return restaurantRequest<{ items: RestaurantCustomerHospitalityProfile[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/crm/profiles${query.size ? `?${query}` : ""}`); };
export const getRestaurantCrmProfile = (customerProfileId: number) => restaurantRequest<RestaurantCustomerHospitalityProfile>(`/crm/profiles/${customerProfileId}`);
export const updateRestaurantCrmProfile = (customerProfileId: number, input: Record<string, unknown>) => restaurantRequest<RestaurantCustomerHospitalityProfile>(`/crm/profiles/${customerProfileId}`, { method: "PATCH", body: JSON.stringify(input) });
export const recalculateRestaurantCrmProfile = (customerProfileId: number) => restaurantRequest<RestaurantCustomerHospitalityProfile>(`/crm/profiles/${customerProfileId}/recalculate`, { method: "POST" });

export type RestaurantShiftCloseout = { id: number; shift_id: number; status: "PREVIEWED" | "CLOSED" | "FINALIZED" | "REOPENED"; closed_at: string | null; finalized_at: string | null; manager_notes: string | null; operational_issues: string | null; revenue_summary: Record<string, unknown> | null; tip_summary: Record<string, unknown> | null; discount_summary: Record<string, unknown> | null; missing_data_warnings: string[] | null; waiter_performance_snapshots: Array<Record<string, unknown>> | null; shift: RestaurantShift; };
export const getRestaurantCloseout = (shiftId: number) => restaurantRequest<RestaurantShiftCloseout>(`/shifts/${shiftId}/closeout`);
export const previewRestaurantCloseout = (shiftId: number) => restaurantRequest<{ shift: RestaurantShift; snapshot: Record<string, unknown> }>(`/shifts/${shiftId}/closeout/preview`);
export const closeRestaurantCloseout = (shiftId: number, input: { manager_notes?: string | null; operational_issues?: string | null; override_warnings?: boolean; override_reason?: string | null } = {}) => restaurantRequest<RestaurantShiftCloseout>(`/shifts/${shiftId}/closeout`, { method: "POST", body: JSON.stringify(input) });
export const finalizeRestaurantCloseout = (shiftId: number) => restaurantRequest<RestaurantShiftCloseout>(`/shifts/${shiftId}/closeout/finalize`, { method: "POST" });
export const reopenRestaurantCloseout = (shiftId: number, reason: string) => restaurantRequest<RestaurantShiftCloseout>(`/shifts/${shiftId}/closeout/reopen`, { method: "POST", body: JSON.stringify({ reason }) });
export const adjustRestaurantCloseout = (shiftId: number, input: { section: string; adjusted_snapshot: unknown; reason: string }) => restaurantRequest<RestaurantShiftCloseout>(`/shifts/${shiftId}/closeout/adjust`, { method: "POST", body: JSON.stringify(input) });
export const restaurantCloseoutExportUrl = (shiftId: number) => resolveBackendUrl(`/api/admin/restaurant/shifts/${shiftId}/closeout/export`);
export const listRestaurantCloseouts = (params: { status?: RestaurantShiftCloseout["status"]; limit?: number } = {}) => { const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])); return restaurantRequest<RestaurantShiftCloseout[]>(`/closeouts${query.size ? `?${query}` : ""}`); };
export async function fetchRestaurantCloseoutExport(shiftId: number): Promise<string> { const response = await fetch(restaurantCloseoutExportUrl(shiftId), { credentials: "include" }); if (!response.ok) { const payload = await response.json().catch(() => null); throw normalizeApiError(payload, response.status, "No pudimos exportar el cierre."); } return URL.createObjectURL(await response.blob()); }
export const saveMyRestaurantVisit = (input: Record<string, unknown>) => restaurantRequest<RestaurantVisit>("/my-floor/visits", { method: "POST", body: JSON.stringify(input) });
