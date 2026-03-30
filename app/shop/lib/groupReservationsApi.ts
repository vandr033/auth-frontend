import { resolvePublicApiUrl } from "./shopData";

export type GroupItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type GroupBookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";
export type GroupPaymentMethod = "NONE" | "CASH" | "QR";
export type GroupPaymentStatus = "UNPAID" | "PENDING_CONFIRMATION" | "PAID" | "REJECTED";
export type GroupPricingMode = "PER_SESSION" | "WEEKLY_PASS" | "MONTHLY_PASS";
export type GroupRecurrenceType = "WEEKLY" | "MONTHLY" | "CUSTOM";
export type GroupStaffRole = "INSTRUCTOR" | "ASSISTANT";

export interface GroupStaffAssignment {
  id: number;
  company_id: number;
  group_event_id: number | null;
  group_class_id: number | null;
  staff_profile_id: number | null;
  display_name: string | null;
  display_phone: string | null;
  role: GroupStaffRole;
  staff_profile?: {
    id: number;
    display_name: string;
    image_url: string | null;
  } | null;
}

export interface PublicGroupEvent {
  id: number;
  company_id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  status: GroupItemStatus;
  is_free: boolean;
  price_cents: number;
  max_capacity: number;
  start_at: string;
  end_at: string;
  location_text: string | null;
  created_at: string;
  updated_at: string;
  staff_assignments?: GroupStaffAssignment[];
  _count?: {
    bookings?: number;
    interests?: number;
  };
  booked_spots_confirmed?: number;
  booked_spots_pending?: number;
}

export interface PublicGroupClassSession {
  id: number;
  company_id: number;
  group_class_id: number;
  start_at: string;
  end_at: string;
  status: GroupItemStatus;
  cancelled_at: string | null;
  cancel_reason: string | null;
  max_capacity?: number;
  booked_count?: number;
}

export interface PublicGroupClass {
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
  session_duration_minutes: number;
  recurrence_type: GroupRecurrenceType;
  recurrence_config: Record<string, unknown>;
  recurrence_start_date: string;
  recurrence_end_date: string | null;
  start_time: string;
  location_text: string | null;
  created_at: string;
  updated_at: string;
  staff_assignments?: GroupStaffAssignment[];
  sessions?: PublicGroupClassSession[];
  _count?: {
    sessions?: number;
    enrollments?: number;
  };
}

export interface PublicGroupEventBooking {
  id: number;
  company_id: number;
  group_event_id: number;
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
  group_event?: {
    id: number;
    title: string;
    slug: string;
    start_at: string;
    end_at: string;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    is_free: boolean;
    location_text: string | null;
    company: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface PublicGroupClassEnrollment {
  id: number;
  company_id: number;
  group_class_id: number;
  user_id: string;
  pricing_mode: GroupPricingMode;
  price_cents_snapshot: number;
  status: GroupBookingStatus;
  payment_method: GroupPaymentMethod;
  payment_status: GroupPaymentStatus;
  qr_proof_image_url: string | null;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  group_class?: {
    id: number;
    title: string;
    slug: string;
    pricing_mode: GroupPricingMode;
    cover_image_url: string | null;
    thumbnail_url: string | null;
    location_text: string | null;
    company: {
      id: number;
      name: string;
      slug: string;
    };
  };
}

export interface CapturePublicEventInterestResult {
  already_interested: boolean;
}

type ApiEnvelope<T> = {
  code: number;
  error: boolean;
  message: string;
  data: T;
};

const resolveApiUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  return resolvePublicApiUrl(path);
};

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null) {
    const maybe = payload as { error?: unknown; message?: unknown };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
    if (typeof maybe.error === "string" && maybe.error) return maybe.error;
  }
  return fallback;
}

async function groupFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, `Request failed (${response.status})`));
  }

  const envelope = payload as Partial<ApiEnvelope<T>> | null;
  if (envelope && envelope.error) {
    throw new Error(envelope.message || "Request failed");
  }

  if (envelope && "data" in (envelope as object)) {
    return envelope.data as T;
  }

  return payload as T;
}

export async function listPublicEvents(companyId: number, upcoming = true): Promise<PublicGroupEvent[]> {
  const query = buildQuery({ company_id: companyId, upcoming });
  return groupFetch<PublicGroupEvent[]>(`/group/events${query}`);
}

export async function getPublicEventById(companyId: number, eventId: number): Promise<PublicGroupEvent> {
  const query = buildQuery({ company_id: companyId });
  return groupFetch<PublicGroupEvent>(`/group/events/${eventId}${query}`);
}

export async function listPublicClasses(companyId: number): Promise<PublicGroupClass[]> {
  const query = buildQuery({ company_id: companyId });
  return groupFetch<PublicGroupClass[]>(`/group/classes${query}`);
}

export async function getPublicClassById(companyId: number, classId: number): Promise<PublicGroupClass> {
  const query = buildQuery({ company_id: companyId });
  return groupFetch<PublicGroupClass>(`/group/classes/${classId}${query}`);
}

export async function listPublicClassSessions(companyId: number, classId: number): Promise<PublicGroupClassSession[]> {
  const query = buildQuery({ company_id: companyId });
  return groupFetch<PublicGroupClassSession[]>(`/group/classes/${classId}/sessions${query}`);
}

export async function createPublicEventBooking(payload: {
  company_id: number;
  group_event_id: number;
  booked_spots?: number;
  payment_method: GroupPaymentMethod;
  qr_proof_image_url?: string | null;
  extra_attendees?: Array<{
    full_name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  notes?: string | null;
}): Promise<PublicGroupEventBooking> {
  return groupFetch<PublicGroupEventBooking>("/group/events/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPublicClassEnrollment(payload: {
  company_id: number;
  group_class_id: number;
  group_class_session_id?: number;
  payment_method: GroupPaymentMethod;
  qr_proof_image_url?: string | null;
}): Promise<PublicGroupClassEnrollment> {
  return groupFetch<PublicGroupClassEnrollment>("/group/classes/enrollments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function joinPublicEventWaitlist(companyId: number, eventId: number): Promise<void> {
  await groupFetch<void>(`/group/events/${eventId}/waitlist`, {
    method: "POST",
    body: JSON.stringify({ company_id: companyId }),
  });
}

export async function leavePublicEventWaitlist(companyId: number, eventId: number): Promise<void> {
  await groupFetch<void>(`/group/events/${eventId}/waitlist`, {
    method: "DELETE",
    body: JSON.stringify({ company_id: companyId }),
  });
}

export async function capturePublicEventInterest(companyId: number, eventId: number): Promise<CapturePublicEventInterestResult> {
  return groupFetch<CapturePublicEventInterestResult>(`/group/events/${eventId}/interest`, {
    method: "POST",
    body: JSON.stringify({ company_id: companyId }),
  });
}

export async function getMyPublicGroupBookings(): Promise<PublicGroupEventBooking[]> {
  return groupFetch<PublicGroupEventBooking[]>("/group/my/bookings");
}

export async function getMyPublicGroupEnrollments(): Promise<PublicGroupClassEnrollment[]> {
  return groupFetch<PublicGroupClassEnrollment[]>("/group/my/enrollments");
}

export async function uploadGroupQrProof(file: File, companyId: number): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("company_id", String(companyId));

  const response = await fetch(resolveApiUrl("/upload/qr"), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Failed to upload QR proof"));
  }

  if (typeof payload === "object" && payload !== null) {
    const maybe = payload as { data?: { url?: unknown }; message?: unknown; error?: unknown };
    if (typeof maybe.data?.url === "string") {
      return maybe.data.url;
    }
    if (typeof maybe.message === "string" && maybe.message) {
      throw new Error(maybe.message);
    }
  }

  throw new Error("Failed to upload QR proof");
}

export async function deleteGroupQrProof(url: string): Promise<void> {
  try {
    await fetch(resolveApiUrl("/upload/qr"), {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });
  } catch {
    // best-effort cleanup
  }
}
