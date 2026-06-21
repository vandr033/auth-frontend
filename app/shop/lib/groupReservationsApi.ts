import { resolvePublicApiUrl } from "./shopData";

export type GroupItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type GroupBookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "WAITLISTED";
export type GroupPaymentMethod = "NONE" | "CASH" | "QR";
export type GroupPaymentStatus = "UNPAID" | "PENDING_CONFIRMATION" | "PAID" | "REJECTED";
export type GroupInstallmentDerivedStatus = GroupPaymentStatus | "OVERDUE";
export type GroupPricingMode = "PER_SESSION" | "WEEKLY_PASS" | "MONTHLY_PASS" | "FULL_COURSE";
export type GroupRecurrenceType = "WEEKLY" | "MONTHLY" | "CUSTOM";
export type GroupStaffRole = "INSTRUCTOR" | "ASSISTANT";
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
  capacity_visible: boolean;
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
  source?: "GROUP_EVENT_BOOKING" | "FREE_REGISTRATION";
  reservation_code?: string | null;
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
  ticket?: {
    id: number;
    ticket_code: string;
    status: string;
    valid_from: string;
    valid_until: string;
    qr_token: string;
    qr_image_url: string;
  } | null;
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
  derived_status?: GroupInstallmentDerivedStatus;
  is_overdue?: boolean;
  last_reminder_at?: string | null;
  last_reminder_channel?: "WHATSAPP" | "EMAIL" | null;
  reminder_logs?: InstallmentReminderLogRow[];
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

export interface CustomerPaymentPlanSummary {
  total_installments: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  next_due_date: string | null;
  current_month_status: GroupInstallmentDerivedStatus | null;
  total_amount_cents: number;
  paid_amount_cents: number;
}

export interface GroupEnrollmentInstallmentPlan {
  enrollment: PublicGroupClassEnrollment & {
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
    group_class?: NonNullable<PublicGroupClassEnrollment["group_class"]> & {
      location_text?: string | null;
    };
  };
  installments: GroupEnrollmentInstallment[];
  summary: CustomerPaymentPlanSummary;
}

export interface CapturePublicEventInterestResult {
  already_interested: boolean;
}

export interface PublicSessionAttendanceState {
  token: string;
  company: {
    id: number;
    name: string;
    slug: string;
    timezone?: string | null;
    currency?: string | null;
  };
  group_class: {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    status: GroupItemStatus;
    pricing_mode: GroupPricingMode;
    price_cents: number;
    monthly_price_cents?: number | null;
    recurrence_start_date: string;
    recurrence_end_date: string | null;
    start_time?: string | null;
    location_text?: string | null;
    max_capacity_per_session?: number;
    cover_image_url?: string | null;
    thumbnail_url?: string | null;
  };
  session: {
    id: number;
    start_at: string;
    end_at: string;
    status: GroupItemStatus;
    cancelled_at: string | null;
    cancel_reason: string | null;
    public_attendance_enabled: boolean;
    requires_access_code: boolean;
  };
  is_authenticated: boolean;
  already_checked_in: boolean;
  attendance: {
    id: number;
    checked_in_at: string | null;
    checked_in_method: "QR_SCAN" | "MANUAL" | "PUBLIC_LINK" | null;
    enrollment_id: number | null;
    created_at: string;
  } | null;
  profile: {
    full_name: string | null;
    email: string | null;
    country_code: string | null;
    phone_prefix: string | null;
    phone_number: string | null;
    profile_locked: boolean;
    missing_profile_fields: string[];
  };
}

export interface PublicSessionAttendanceSubmitResult {
  outcome: "already_checked_in" | "checked_in_existing_enrollment" | "sponsored_enrollment_created_and_checked_in";
  attendance: {
    id: number;
    checked_in_at: string | null;
    checked_in_method: "QR_SCAN" | "MANUAL" | "PUBLIC_LINK" | null;
    enrollment_id: number | null;
    created_at: string;
  };
  enrollment: {
    id: number;
    group_class_id: number;
    pricing_mode: GroupPricingMode;
    price_cents_snapshot: number;
    status: GroupBookingStatus;
    payment_method: GroupPaymentMethod;
    payment_status: GroupPaymentStatus;
    valid_from: string;
    valid_until: string;
    is_admin_sponsored: boolean;
    source: GroupEnrollmentSource;
    sponsorship_reason: string | null;
  } | null;
  ticket_queued: boolean;
  sponsored_enrollment_created: boolean;
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

export async function getPublicSessionAttendanceState(token: string): Promise<PublicSessionAttendanceState> {
  return groupFetch<PublicSessionAttendanceState>(`/group/classes/sessions/attendance/${token}`);
}

export async function startPublicSessionAttendance(
  token: string,
  payload: PublicSessionAttendanceStartInput,
): Promise<PublicSessionAttendanceStartResult> {
  return groupFetch<PublicSessionAttendanceStartResult>(`/group/classes/sessions/attendance/${token}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendPublicSessionAttendance(
  token: string,
  payload: PublicSessionAttendanceResendInput,
): Promise<PublicSessionAttendanceStartResult> {
  return groupFetch<PublicSessionAttendanceStartResult>(`/group/classes/sessions/attendance/${token}/resend`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyPublicSessionAttendance(
  token: string,
  payload: PublicSessionAttendanceVerifyInput,
): Promise<PublicSessionAttendanceVerifyResult> {
  return groupFetch<PublicSessionAttendanceVerifyResult>(`/group/classes/sessions/attendance/${token}/verify`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitPublicSessionAttendance(
  token: string,
  payload: {
    checkout_session_id?: string;
    access_code?: string | null;
    full_name?: string;
    email?: string;
    countryCode?: string;
    phonePrefix?: string;
    phoneNumber?: string;
  },
): Promise<PublicSessionAttendanceSubmitResult> {
  return groupFetch<PublicSessionAttendanceSubmitResult>(`/group/classes/sessions/attendance/${token}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
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

export interface PaidEventGuestCheckoutStartInput {
  company_id: number;
  full_name: string;
  email: string;
  countryCode?: string;
  phonePrefix: string;
  phoneNumber: string;
  tosAccepted: boolean;
}

export interface PaidEventGuestCheckoutOtpDelivery {
  emailSent: boolean;
  phoneSent: boolean;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

export interface PaidEventGuestCheckoutStartResult {
  checkout_session_id: string | null;
  accountOutcome:
    | "NEW_ACCOUNT_PENDING_CREATION"
    | "ACCOUNT_FOUND_BY_EMAIL"
    | "ACCOUNT_FOUND_BY_PHONE"
    | "ACCOUNT_ALREADY_EXISTS"
    | "ACCOUNT_CONFLICT_PHONE_EMAIL";
  otpDelivery: PaidEventGuestCheckoutOtpDelivery;
  expiresAt: string | null;
  resendCooldownSeconds: number;
  canVerify: boolean;
}

export interface PaidEventGuestCheckoutResendInput {
  company_id: number;
  checkout_session_id: string;
}

export type PaidEventGuestCheckoutResendResult = PaidEventGuestCheckoutStartResult;

export interface PaidEventGuestCheckoutVerifyInput {
  company_id: number;
  checkout_session_id: string;
  code: string;
}

export interface PaidEventGuestCheckoutVerifyResult {
  authenticated: true;
  storefrontLinked: true;
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    country_code?: string | null;
    phone_prefix?: string | null;
    phoneNumber?: string | null;
    emailVerified?: boolean;
    phoneNumberVerified?: boolean;
    image?: string | null;
  };
}

export async function startPaidEventGuestCheckout(
  eventId: number,
  payload: PaidEventGuestCheckoutStartInput,
): Promise<PaidEventGuestCheckoutStartResult> {
  return groupFetch<PaidEventGuestCheckoutStartResult>(`/group/events/${eventId}/guest-checkout/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendPaidEventGuestCheckout(
  eventId: number,
  payload: PaidEventGuestCheckoutResendInput,
): Promise<PaidEventGuestCheckoutResendResult> {
  return groupFetch<PaidEventGuestCheckoutResendResult>(`/group/events/${eventId}/guest-checkout/resend`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyPaidEventGuestCheckout(
  eventId: number,
  payload: PaidEventGuestCheckoutVerifyInput,
): Promise<PaidEventGuestCheckoutVerifyResult> {
  return groupFetch<PaidEventGuestCheckoutVerifyResult>(`/group/events/${eventId}/guest-checkout/verify`, {
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

export interface ClassGuestEnrollmentStartInput {
  company_id: number;
  full_name: string;
  email: string;
  countryCode?: string;
  phonePrefix: string;
  phoneNumber: string;
}

export type ClassGuestEnrollmentStartResult = PaidEventGuestCheckoutStartResult;

export interface ClassGuestEnrollmentVerifyInput {
  company_id: number;
  checkout_session_id: string;
  code: string;
}

export type ClassGuestEnrollmentVerifyResult = PaidEventGuestCheckoutVerifyResult & {
  interestCaptured?: boolean;
};

export interface PublicSessionAttendanceStartInput {
  full_name: string;
  email: string;
  countryCode?: string;
  phonePrefix: string;
  phoneNumber: string;
}
export type PublicSessionAttendanceStartResult = ClassGuestEnrollmentStartResult;
export interface PublicSessionAttendanceResendInput {
  checkout_session_id: string;
}
export interface PublicSessionAttendanceVerifyInput {
  checkout_session_id: string;
  code: string;
}
export type PublicSessionAttendanceVerifyResult = PaidEventGuestCheckoutVerifyResult;

export async function startClassGuestEnrollment(
  classId: number,
  payload: ClassGuestEnrollmentStartInput,
): Promise<ClassGuestEnrollmentStartResult> {
  return groupFetch<ClassGuestEnrollmentStartResult>(`/group/classes/${classId}/guest-enrollment/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resendClassGuestEnrollment(
  classId: number,
  payload: PaidEventGuestCheckoutResendInput,
): Promise<ClassGuestEnrollmentStartResult> {
  return groupFetch<ClassGuestEnrollmentStartResult>(`/group/classes/${classId}/guest-enrollment/resend`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyClassGuestEnrollment(
  classId: number,
  payload: ClassGuestEnrollmentVerifyInput,
): Promise<ClassGuestEnrollmentVerifyResult> {
  return groupFetch<ClassGuestEnrollmentVerifyResult>(`/group/classes/${classId}/guest-enrollment/verify`, {
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

export async function capturePublicClassInterest(companyId: number, classId: number): Promise<CapturePublicEventInterestResult> {
  return groupFetch<CapturePublicEventInterestResult>(`/group/classes/${classId}/interest`, {
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

export async function getMyGroupPaymentPlans(): Promise<GroupEnrollmentInstallmentPlan[]> {
  return groupFetch<GroupEnrollmentInstallmentPlan[]>("/group/my/payment-plans");
}

export async function resendMyClassTicket(enrollmentId: number): Promise<void> {
  await groupFetch<unknown>(`/group/my/enrollments/${enrollmentId}/ticket/resend`, {
    method: "POST",
  });
}

export async function listMyEnrollmentInstallments(companyId: number, enrollmentId: number): Promise<GroupEnrollmentInstallmentPlan> {
  const query = buildQuery({ company_id: companyId });
  return groupFetch<GroupEnrollmentInstallmentPlan>(`/group/my/enrollments/${enrollmentId}/installments${query}`);
}

export async function submitMyInstallmentQrProof(payload: {
  company_id: number;
  enrollment_id: number;
  installment_id: number;
  qr_proof_image_url: string;
}): Promise<GroupEnrollmentInstallment> {
  return groupFetch<GroupEnrollmentInstallment>(
    `/group/my/enrollments/${payload.enrollment_id}/installments/${payload.installment_id}/qr-proof`,
    {
      method: "POST",
      body: JSON.stringify({
        company_id: payload.company_id,
        qr_proof_image_url: payload.qr_proof_image_url,
      }),
    },
  );
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

// ── Free Event Registration ──

export interface FreeEventRegistrationInput {
  company_id: number;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  email: string;
  countryCode?: string;
  phonePrefix: string;
  phoneNumber: string;
  tosAccepted: boolean;
  createAccount?: boolean;
  otpChannelPreference?: "email" | "phone";
}

export interface FreeRegistrationStateData {
  hasRegistration: boolean;
  status: 'CONFIRMED' | 'PENDING' | 'INTERESTED' | null;
  prefill: {
    firstName: string;
    lastName: string;
    gender: string;
    age: number | null;
    email: string;
    countryCode?: string;
    phonePrefix: string;
    phoneNumber: string;
  } | null;
}

export interface FreeRegistrationResult {
  success: true;
  eventOutcome: "REGISTERED" | "INTERESTED" | "ALREADY_REGISTERED";
  registrationStatus?: "CONFIRMED" | "PENDING" | "INTERESTED";
  modalType: "POSITIVE" | "NEGATIVE";
  accountOutcome:
    | "NOT_REQUESTED"
    | "ACCOUNT_CREATED_PENDING_VERIFICATION"
    | "ACCOUNT_FOUND_BY_EMAIL"
    | "ACCOUNT_FOUND_BY_PHONE"
    | "ACCOUNT_ALREADY_EXISTS"
    | "ACCOUNT_CONFLICT_PHONE_EMAIL";
  createdUserId?: string | null;
  otpSection?: {
    show: boolean;
    mode: "SIGN_UP_VERIFY" | "SIGN_IN_OTP" | null;
    primaryChannel: "email" | "phone" | null;
    availableChannels?: Array<"email" | "phone">;
    maskedDestination?: string | null;
  };
  nextActions?: {
    canCompleteMissingPhoneLater?: boolean;
    canCompleteMissingEmailLater?: boolean;
    canManualSignIn?: boolean;
  };
  reservationCode?: string | null;
  messageKey: string;
  registrationId: number;
  soldOut: boolean;
  createAccountRequested: boolean;
}

export async function getFreeRegistrationState(
  companyId: number,
  eventId: number,
): Promise<FreeRegistrationStateData> {
  return groupFetch<FreeRegistrationStateData>(
    `/group/events/${eventId}/free-registration-state?company_id=${companyId}`,
  );
}

export async function submitFreeEventRegistration(
  eventId: number,
  input: FreeEventRegistrationInput,
): Promise<FreeRegistrationResult> {
  return groupFetch<FreeRegistrationResult>(`/group/events/${eventId}/free-register`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
