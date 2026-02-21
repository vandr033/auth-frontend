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
        const message = data?.error || data?.message || `Request failed: ${response.status}`;
        throw new Error(message);
    }

    return data;
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
    notes?: string;
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

// ============ STAFF ============

export interface StaffMember {
    id: number;
    display_name: string;
    bio?: string;
    image_url?: string;
    is_bookable: boolean;
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
