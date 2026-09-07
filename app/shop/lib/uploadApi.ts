import { DEFAULT_LOCALE, getLocaleCookie, translate } from "@/lib/i18n";
import { resolveApiUrl } from "@/lib/api-url";

export const UPLOAD_ERROR_CODES = [
  "UPLOAD_TOO_LARGE",
  "UPLOAD_TYPE_NOT_ALLOWED",
  "UPLOAD_SIGNATURE_INVALID",
  "UPLOAD_INTENT_INVALID",
  "UPLOAD_INTENT_EXPIRED",
  "UPLOAD_INTENT_REPLAYED",
] as const;

export type UploadErrorCode = (typeof UPLOAD_ERROR_CODES)[number];

export type PublicUploadPurpose =
  | "BOOKING_QR_PROOF"
  | "ORDER_PAYMENT_PROOF"
  | "RESTAURANT_DEPOSIT_PROOF"
  | "GROUP_PAYMENT_PROOF";

export type PublicUploadContext =
  | { type: "BOOKING"; id?: string }
  | { type: "CHECKOUT" }
  | { type: "ORDER"; orderNumber: string }
  | { type: "EVENT"; id: number }
  | { type: "CLASS"; id: number }
  | { type: "INSTALLMENT"; enrollmentId: number; installmentId: number }
  | { type: "RESERVATION"; reservationCode: string };

export type UploadIntent = {
  uploadIntent: string;
  expiresAt: string;
  maxBytes: number;
  allowedMimeTypes: string[];
  purpose: PublicUploadPurpose;
  contextId: string | null;
};

export type UploadedPublicFile = {
  url: string;
  deleteToken?: string;
  filename?: string;
  size?: number;
  mimetype?: string;
  purpose?: PublicUploadPurpose;
  contextId?: string | null;
};

export class UploadClientError extends Error {
  readonly code: UploadErrorCode | null;
  readonly status: number;

  constructor(code: UploadErrorCode | null, status: number, fallbackKey = "uploadErrors.generic") {
    super(getUploadErrorMessage(code, fallbackKey));
    this.name = "UploadClientError";
    this.code = code;
    this.status = status;
  }
}

const translationKeyByCode: Record<UploadErrorCode, string> = {
  UPLOAD_TOO_LARGE: "uploadErrors.tooLarge",
  UPLOAD_TYPE_NOT_ALLOWED: "uploadErrors.typeNotAllowed",
  UPLOAD_SIGNATURE_INVALID: "uploadErrors.signatureInvalid",
  UPLOAD_INTENT_INVALID: "uploadErrors.intentInvalid",
  UPLOAD_INTENT_EXPIRED: "uploadErrors.intentExpired",
  UPLOAD_INTENT_REPLAYED: "uploadErrors.intentReplayed",
};

function isUploadErrorCode(value: unknown): value is UploadErrorCode {
  return typeof value === "string" && (UPLOAD_ERROR_CODES as readonly string[]).includes(value);
}

function getResponseErrorCode(payload: unknown): UploadErrorCode | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { errorCode?: unknown; reason?: unknown; error?: unknown };
  if (isUploadErrorCode(record.errorCode)) return record.errorCode;
  if (isUploadErrorCode(record.reason)) return record.reason;
  if (record.error && typeof record.error === "object") {
    const nested = record.error as { errorCode?: unknown; reason?: unknown };
    if (isUploadErrorCode(nested.errorCode)) return nested.errorCode;
    if (isUploadErrorCode(nested.reason)) return nested.reason;
  }
  return null;
}

export function getUploadErrorMessage(code: UploadErrorCode | null, fallbackKey = "uploadErrors.generic"): string {
  const locale = getLocaleCookie() ?? DEFAULT_LOCALE;
  return translate(locale, code ? translationKeyByCode[code] : fallbackKey);
}

async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function throwUploadResponseError(response: Response, fallbackKey = "uploadErrors.generic"): Promise<never> {
  const payload = await parseJson(response);
  const code = getResponseErrorCode(payload);
  throw new UploadClientError(code, response.status, fallbackKey);
}

export async function requestUploadIntent(params: {
  slug: string;
  purpose: PublicUploadPurpose;
  context?: PublicUploadContext;
  reservationCode?: string;
  accessToken?: string | null;
}): Promise<UploadIntent> {
  const response = await fetch(resolveApiUrl(`/api/upload/intents/${encodeURIComponent(params.slug)}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      purpose: params.purpose,
      context: params.context,
      reservationCode: params.reservationCode,
      accessToken: params.accessToken,
    }),
  });
  if (!response.ok) await throwUploadResponseError(response, "uploadErrors.intentInvalid");
  const payload = await parseJson(response) as { data?: UploadIntent } | null;
  if (!payload?.data?.uploadIntent) throw new UploadClientError("UPLOAD_INTENT_INVALID", response.status);
  return payload.data;
}

export async function uploadPublicMultipart<T>(params: {
  slug: string;
  file: File;
  purpose: PublicUploadPurpose;
  context?: PublicUploadContext;
  reservationCode?: string;
  accessToken?: string | null;
  endpoint?: string;
  field?: "image" | "file";
}): Promise<T> {
  const intent = await requestUploadIntent(params);
  const formData = new FormData();
  formData.append(params.field ?? "image", params.file);
  formData.append("uploadIntent", intent.uploadIntent);
  if (params.accessToken) formData.append("accessToken", params.accessToken);

  const response = await fetch(resolveApiUrl(params.endpoint ?? "/upload/qr"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) await throwUploadResponseError(response);
  const payload = await parseJson(response) as { data?: T } | null;
  if (!payload || payload.data === undefined) throw new UploadClientError("UPLOAD_INTENT_INVALID", response.status);
  return payload.data;
}

export async function uploadPublicProof(params: {
  slug: string;
  file: File;
  purpose: PublicUploadPurpose;
  context?: PublicUploadContext;
  reservationCode?: string;
  accessToken?: string | null;
  endpoint?: string;
  field?: "image" | "file";
}): Promise<UploadedPublicFile> {
  const uploaded = await uploadPublicMultipart<UploadedPublicFile>(params);
  if (!uploaded.url) throw new UploadClientError("UPLOAD_INTENT_INVALID", 200);
  return uploaded;
}

export async function deletePublicUpload(
  url: string,
  deleteToken: string,
  kind: "qr" | "file" = "qr",
): Promise<void> {
  const response = await fetch(resolveApiUrl(`/upload/${kind}`), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, deleteToken }),
  });
  if (!response.ok) await throwUploadResponseError(response);
}
