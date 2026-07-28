import { resolvePublicApiUrl } from "./shopData";

export type PublicRestaurantConfiguration = {
  company: { slug: string; name: string; timezone: string; logoUrl: string | null; address: string | null };
  restaurant: { minimumPartySize: number; maximumPartySize: number; minimumAdvanceMinutes: number; maximumAdvanceDays: number; slotIntervalMinutes: number; averageDiningMinutes: number; requirePhone: boolean; requireEmail: boolean; allowCustomerCancellation: boolean; autoConfirmReservations: boolean; guestWhatsappInvitationsEnabled: boolean; depositEnabled: boolean; depositAmountCents: number; depositMode: "PER_PERSON" | "PER_TABLE"; depositQrImageUrl: string | null; phonePrefix: string };
};
export type PublicRestaurantSlot = { time: string; available: boolean };
export type PublicRestaurantReservation = {
  code: string; status: "PENDING" | "CONFIRMED" | "ARRIVED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  date: string; time: string; partySize: number; customerName: string; notes: string | null; depositAmountCents: number; depositMode: "PER_PERSON" | "PER_TABLE" | null; canCancel: boolean; cancellationDeadline: string;
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
export const createPublicRestaurantReservation = (slug: string, input: { date: string; time: string; partySize: number; customer: { name: string; phone?: string | null; phonePrefix?: string | null; countryCode?: string | null; email?: string | null }; guests?: Array<{ name: string; phone: string; phonePrefix?: string | null; countryCode?: string | null }>; depositProofImageUrl?: string | null; notes?: string | null }) => request<{ reservation: PublicRestaurantReservation; message: string }>(`/restaurant/public/${encodeURIComponent(slug)}/reservations`, { method: "POST", body: JSON.stringify(input) });
export async function uploadPublicRestaurantDepositProof(slug: string, file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(resolvePublicApiUrl(`/restaurant/public/${encodeURIComponent(slug)}/deposit-proof`), { method: "POST", body, credentials: "include" });
  const payload = await response.json().catch(() => ({})) as ApiResponse<{ url: string }>;
  if (!response.ok || payload.error || !payload.data?.url) throw Object.assign(new Error(payload.message || "No pudimos cargar el comprobante."), { status: response.status });
  return payload.data.url;
}
export const getMyPublicRestaurantReservations = (slug: string) => request<{ reservations: PublicRestaurantReservation[] }>(`/restaurant/public/${encodeURIComponent(slug)}/my-reservations`);
export const getPublicRestaurantReservation = (code: string) => request<{ reservation: PublicRestaurantReservation }>(`/restaurant/public/reservations/${encodeURIComponent(code)}`);
export const cancelPublicRestaurantReservation = (code: string, reason?: string) => request<{ reservation: PublicRestaurantReservation }>(`/restaurant/public/reservations/${encodeURIComponent(code)}/cancel`, { method: "POST", body: JSON.stringify(reason ? { reason } : {}) });
