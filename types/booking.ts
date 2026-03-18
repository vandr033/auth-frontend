import { formatCurrencyFromCents } from "@/lib/currency";

// Types for the booking wizard

export type BookingStep = 1 | 2 | 3 | 4;

export interface SelectedService {
    id: number;
    name: string;
    description?: string;
    price_cents: number;
    duration_minutes: number;
    category_id: number;
}

export interface SelectedStaff {
    id: number | 'any';
    display_name: string;
    image_url?: string;
    services?: number[];
}

export interface SelectedSlot {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    staff_id: number;
    staff_name: string;
}

export interface BookingState {
    step: BookingStep;
    services: SelectedService[];
    staff: SelectedStaff | null;
    slot: SelectedSlot | null;
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
    staff_id: number;
    customer_id: string;
    service_ids: number[];
    start_at: string;
    payment_method: 'CASH' | 'QR' | 'NONE';
    notes?: string;
    qr_proof_image_url?: string;
    booking_source?: 'MARKETPLACE' | 'SALON_SITE' | 'ADMIN' | 'MANUAL';
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

// Calculate totals from selected services
export function calculateBookingTotals(services: SelectedService[]) {
    const totalPrice = services.reduce((sum, s) => sum + s.price_cents, 0);
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
