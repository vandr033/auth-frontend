import { AdminBooking, BookingStatus } from "@/types/admin-booking";

export const NO_SHOW_NOTE_MARKER = "[NO_SHOW]";

export function hasNoShowMarker(notes?: string | null): boolean {
    return (notes || "").includes(NO_SHOW_NOTE_MARKER);
}

export function isNoShowBooking(booking: Pick<AdminBooking, "status" | "notes">): boolean {
    return booking.status === "NO_SHOW" || (booking.status === "CANCELLED" && hasNoShowMarker(booking.notes));
}

export function getBookingDisplayStatus(booking: Pick<AdminBooking, "status" | "notes">): BookingStatus {
    return isNoShowBooking(booking) ? "NO_SHOW" : booking.status;
}

export function appendNoShowMarker(notes?: string | null): string {
    const base = (notes || "").trim();
    if (base.includes(NO_SHOW_NOTE_MARKER)) {
        return base;
    }
    return base ? `${base}\n${NO_SHOW_NOTE_MARKER}` : NO_SHOW_NOTE_MARKER;
}
