import { formatCurrencyFromCents } from "@/lib/currency";

// Types for the booking wizard

export type BookingStep = 1 | 2 | 3 | 4;

export interface SelectedService {
    id: number;
    name: string;
    description?: string;
    price_cents: number;
    promo_price_cents?: number | null;
    promo_starts_at?: string | null;
    promo_ends_at?: string | null;
    promo_label?: string | null;
    duration_minutes: number;
    is_multi_session?: boolean;
    session_count?: number | null;
    session_duration_minutes?: number | null;
    category_id: number;
    pricing?: {
        regular_price_cents?: number | null;
        base_price_cents: number;
        final_price_cents: number;
        promo_applied: boolean;
        promo_label?: string | null;
        promo_starts_at?: string | null;
        promo_ends_at?: string | null;
    };
    required_resource_ids?: number[];
}

export interface SelectedStaff {
    id: number | 'any';
    display_name: string;
    image_url?: string;
    services?: number[];
    resource_type?: 'PERSON' | 'ROOM' | 'EQUIPMENT';
}

export interface SelectedSlot {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    staff_id: number;
    staff_name: string;
}

export interface BookingScheduleSlot extends SelectedSlot {
    key: string;
    groupId: string;
    groupLabel: string;
    sessionIndex: number | null;
    sessionCount: number | null;
}

export interface BookingServiceGroup {
    id: string;
    label: string;
    services: SelectedService[];
    fixedStaff: SelectedStaff | null;
    fixedSecondaryStaff: SelectedStaff | null;
    isMultiSession: boolean;
    sessionCount: number;
    sessionDurationMinutes: number;
}

export interface BookingState {
    step: BookingStep;
    services: SelectedService[];
    staff: SelectedStaff | null;
    secondaryStaff: SelectedStaff | null; // required room/equipment auto-applied from service
    slot: SelectedSlot | null;
    groupSlots: Record<string, BookingScheduleSlot | null>;
    paymentMethod: 'CASH' | 'QR' | 'NONE';
    notes: string;
}

export interface TimeSlot {
    time: string; // "10:00"
    staff_id: number;
    staff_name: string;
    available: boolean;
}

export interface BookingRequest {
    company_id: number;
    staff_id?: number;
    secondary_staff_id?: number;
    customer_id: string;
    service_ids?: number[];
    start_at?: string;
    payment_method: 'CASH' | 'QR' | 'NONE';
    notes?: string;
    qr_proof_image_url?: string;
    booking_source?: 'MARKETPLACE' | 'SALON_SITE' | 'ADMIN' | 'MANUAL';
    booking_groups?: Array<{
        client_group_id: string;
        staff_id?: number;
        secondary_staff_id?: number;
        service_ids: number[];
        start_at?: string;
        session_slots?: Array<{ start_at: string }>;
    }>;
}

export interface BookingResponse {
    id: number;
    status: string;
    start_at: string;
    end_at: string;
    total_price_cents: number;
    services: {
        id: number;
        name: string;
        price_cents: number;
    }[];
    staff: {
        id: number;
        display_name: string;
    };
}

export function getServiceDisplayPriceCents(
    service: Pick<SelectedService, "price_cents" | "pricing">,
): number {
    return service.pricing?.final_price_cents ?? service.price_cents;
}

export function getServiceRegularPriceCents(
    service: Pick<SelectedService, "price_cents" | "pricing">,
): number | null {
    if (!service.pricing?.promo_applied) {
        return null;
    }

    return service.pricing.regular_price_cents ?? service.price_cents;
}

// Calculate totals from selected services
export function calculateBookingTotals(services: SelectedService[]) {
    const totalPrice = services.reduce((sum, s) => sum + getServiceDisplayPriceCents(s), 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    return { totalPrice, totalDuration };
}

// Format price in cents to display string
export function formatPrice(cents: number, currency?: string | null): string {
    return formatCurrencyFromCents(cents, currency);
}

// Format duration in minutes to display string
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
