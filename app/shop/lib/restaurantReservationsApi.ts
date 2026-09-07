import { resolvePublicApiUrl } from "./shopData";
import { uploadPublicMultipart } from "./uploadApi";

export type PublicRestaurantConfiguration = {
  company: { slug: string; name: string; timezone: string; logoUrl: string | null; address: string | null };
  restaurant: { minimumPartySize: number; maximumPartySize: number; minimumAdvanceMinutes: number; maximumAdvanceDays: number; slotIntervalMinutes: number; averageDiningMinutes: number; requirePhone: boolean; requireEmail: boolean; allowCustomerCancellation: boolean; autoConfirmReservations: boolean; guestWhatsappInvitationsEnabled: boolean; depositEnabled: boolean; depositAmountCents: number; depositMode: "PER_PERSON" | "PER_TABLE"; depositQrImageUrl: string | null; phonePrefix: string };
};
export type PublicRestaurantSlot = { time: string; available: boolean };
export type PublicRestaurantReservation = {
  code: string; status: "PENDING" | "CONFIRMED" | "ARRIVED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  date: string; time: string; partySize: number; customerName: string; notes: string | null; depositAmountCents: number; depositMode: "PER_PERSON" | "PER_TABLE" | null; canCancel: boolean; cancellationDeadline: string;
  deposit?: { status: string; requiredAmountCents: number; currency: string; hasProof: boolean; rejectionReason: string | null } | null;
  restaurant: { name: string; slug: string; logoUrl: string | null }; publicUrl?: string;
};
type ApiResponse<T> = { data?: T; error?: boolean; message?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolvePublicApiUrl(path), { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, credentials: "include" });
  const body = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || body.error || !body.data) throw Object.assign(new Error(body.message || "No pudimos completar la solicitud."), { status: response.status });
  return body.data;
}

export const getPublicRestaurantConfiguration = (slug: string) => request<PublicRestaurantConfiguration>(`/restaurant/public/${encodeURIComponent(slug)}`);
export const getPublicRestaurantAvailability = (slug: string, date: string, partySize: number) => request<{ date: string; partySize: number; timezone: string; slots: PublicRestaurantSlot[] }>(`/restaurant/public/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}&partySize=${partySize}`);
export const createPublicRestaurantReservation = (slug: string, input: { date: string; time: string; partySize: number; customer: { name: string; phone?: string | null; phonePrefix?: string | null; countryCode?: string | null; email?: string | null }; guests?: Array<{ name: string; phone: string; phonePrefix?: string | null; countryCode?: string | null }>; notes?: string | null }) => request<{ reservation: PublicRestaurantReservation; message: string }>(`/restaurant/public/${encodeURIComponent(slug)}/reservations`, { method: "POST", body: JSON.stringify(input) });
export async function uploadPublicRestaurantDepositProof(slug: string, reservationCode: string, file: File): Promise<{ status: string }> {
  return uploadPublicMultipart<{ status: string }>({
    slug,
    file,
    purpose: "RESTAURANT_DEPOSIT_PROOF",
    context: { type: "RESERVATION", reservationCode },
    reservationCode,
    endpoint: `/restaurant/public/${encodeURIComponent(slug)}/reservations/${encodeURIComponent(reservationCode)}/deposit-proof`,
    field: "file",
  });
}
export const getMyPublicRestaurantReservations = (slug: string) => request<{ reservations: PublicRestaurantReservation[] }>(`/restaurant/public/${encodeURIComponent(slug)}/my-reservations`);
export const getPublicRestaurantReservation = (code: string) => request<{ reservation: PublicRestaurantReservation }>(`/restaurant/public/reservations/${encodeURIComponent(code)}`);
export const cancelPublicRestaurantReservation = (code: string, reason?: string) => request<{ reservation: PublicRestaurantReservation }>(`/restaurant/public/reservations/${encodeURIComponent(code)}/cancel`, { method: "POST", body: JSON.stringify(reason ? { reason } : {}) });
