import { resolveApiUrl } from "@/lib/api-url";

export type ServicePassDuration = "DAY" | "MONTH";
export type ServicePassPaymentMethod = "NONE" | "CASH" | "QR";

export interface ServicePassOffering {
  id: number;
  title: string;
  description: string | null;
  duration: ServicePassDuration;
  price_cents: number;
}

export interface ServicePassPaymentConfig {
  allow_cash_payment: boolean;
  allow_qr_payment: boolean;
  require_comprobante_for_qr: boolean;
  qr_image_url: string | null;
}

export interface ServicePassReservation {
  id: number;
  company_id: number;
  reservation_code: string;
  customer_name: string;
  selected_date: string;
  valid_from: string;
  valid_until: string;
  price_cents_snapshot: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  payment_method: ServicePassPaymentMethod;
  payment_status: "UNPAID" | "PENDING_CONFIRMATION" | "PAID";
  qr_token: string;
  qr_image_url: string;
  offering: Pick<ServicePassOffering, "title" | "duration">;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    throw new Error(result.message || "Unable to complete the pass reservation.");
  }
  return result.data as T;
}

export async function getPublicServicePasses(companyId: number) {
  return request<{
    company: { id: number; slug: string; name: string; timezone: string; currency: string; phone_prefix: string };
    offerings: ServicePassOffering[];
    payment: ServicePassPaymentConfig;
  }>(`/service-passes?company_id=${companyId}`);
}

export async function createPublicServicePassReservation(input: {
  company_id: number;
  offering_id: number;
  selected_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone_prefix: string;
  customer_phone: string;
  payment_method: ServicePassPaymentMethod;
  qr_proof_image_url?: string | null;
  upload_context_id?: string | null;
}) {
  return request<ServicePassReservation>("/service-passes/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPublicServicePassReservation(companyId: number, code: string) {
  return request<ServicePassReservation>(
    `/service-passes/reservations/${encodeURIComponent(code)}?company_id=${companyId}`,
  );
}
