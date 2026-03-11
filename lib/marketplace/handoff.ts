export interface SearchParamsReader {
  get: (name: string) => string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)/;

export interface MarketplaceBookingHandoff {
  source: "marketplace" | "salon_site";
  serviceId: number | null;
  serviceTypeId: number | null;
  companyId: number | null;
  staffId: number | null;
  date: string | null;
  requestedTime: string | null;
  matchedSlotTime: string | null;
  surface: string | null;
}

function toInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFirstCsvInt(value: string | null): number | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim() || null;
  return toInt(first);
}

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  return DATE_PATTERN.test(value) ? value : null;
}

function normalizeTime(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(TIME_PATTERN);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export function parseMarketplaceBookingHandoff(params: SearchParamsReader | null | undefined): MarketplaceBookingHandoff {
  const source = params?.get("source") === "marketplace" ? "marketplace" : "salon_site";
  const matchedSlotTime = normalizeTime(params?.get("matchedSlotTime") || params?.get("time") || null);

  return {
    source,
    serviceId: toInt(params?.get("serviceId") || params?.get("service_id") || null) ?? toFirstCsvInt(params?.get("service_ids") || null),
    serviceTypeId: toInt(params?.get("serviceTypeId") || params?.get("service_type_id") || null),
    companyId: toInt(params?.get("companyId") || params?.get("company_id") || null),
    staffId: toInt(params?.get("staffId") || params?.get("staff_id") || null),
    date: normalizeDate(params?.get("date") || null),
    requestedTime: normalizeTime(params?.get("requestedTime") || null),
    matchedSlotTime,
    surface: params?.get("surface") || null,
  };
}

interface BuildBookingHandoffParamsInput {
  serviceId: number;
  serviceTypeId?: number | null;
  companyId?: number | null;
  date: string;
  requestedTime?: string | null;
  matchedSlotTime: string;
  staffId?: number | null;
  surface?: string | null;
  extraParams?: Record<string, string | number | null | undefined>;
}

export function buildMarketplaceBookingHandoffParams(input: BuildBookingHandoffParamsInput): URLSearchParams {
  const params = new URLSearchParams();
  params.set("source", "marketplace");
  params.set("serviceId", String(input.serviceId));
  params.set("date", input.date);
  params.set("time", input.matchedSlotTime);
  params.set("matchedSlotTime", input.matchedSlotTime);

  if (input.serviceTypeId) params.set("serviceTypeId", String(input.serviceTypeId));
  if (input.companyId) params.set("companyId", String(input.companyId));
  if (input.requestedTime) params.set("requestedTime", input.requestedTime);
  if (input.staffId) params.set("staffId", String(input.staffId));
  if (input.surface) params.set("surface", input.surface);

  if (input.extraParams) {
    Object.entries(input.extraParams).forEach(([key, value]) => {
      if (value == null || params.has(key)) return;
      params.set(key, String(value));
    });
  }

  return params;
}
