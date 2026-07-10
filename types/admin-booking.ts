export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type BookingPaymentStatus = 'UNPAID' | 'PENDING_CONFIRMATION' | 'PAID' | 'REJECTED';

export interface AdminBooking {
    id: number;
    status: BookingStatus;
    start_at: string; // ISO String
    end_at: string;
    created_at: string;
    customer: {
        id?: number;
        full_name: string;
        email?: string;
        phone?: string;
    };
    services: {
        id: number;
        name: string;
        duration: number; // minutes
    }[];
    staff: {
        id: number;
        name: string;
    };
    total_price: number;
    notes?: string;
    payment_method?: 'CASH' | 'QR' | 'NONE';
    payment_status?: BookingPaymentStatus;
    qr_proof_image_url?: string;
}
