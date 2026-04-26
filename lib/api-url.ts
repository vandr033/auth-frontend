const normalizeBaseUrl = (value?: string | null): string =>
  value?.trim().replace(/\/$/, "") ?? "";

const apiBaseUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL);

function joinUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function getApiOriginUrl(): string {
  return apiBaseUrl.replace(/\/api\/?$/, "");
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return joinUrl(getApiBaseUrl(), path);
}

export function resolveBackendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return joinUrl(getApiOriginUrl(), path);
}
