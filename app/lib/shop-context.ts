type SearchParamsLike = {
  get: (name: string) => string | null;
};

const SHOP_SLUG_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const REDIRECT_BASE_ORIGIN = "https://priconpri.local";

function normalizeInternalPath(path: string): string | null {
  const value = path.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;

  try {
    const parsed = new URL(value, REDIRECT_BASE_ORIGIN);
    if (parsed.origin !== REDIRECT_BASE_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function sanitizeInternalRedirectTarget(
  targetPath: string | null | undefined,
  fallbackPath = "/",
): string {
  const safeFallback = normalizeInternalPath(fallbackPath) ?? "/";
  return normalizeInternalPath(targetPath ?? "") ?? safeFallback;
}

export function normalizeShopSlug(value: string | null | undefined): string | null {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug) return null;
  return SHOP_SLUG_PATTERN.test(slug) ? slug : null;
}

export function getShopSlugFromParams(
  searchParams: SearchParamsLike | null | undefined,
): string | null {
  return normalizeShopSlug(searchParams?.get("shop"));
}

export function appendShopParam(path: string, shopSlug: string | null | undefined): string {
  const normalized = normalizeShopSlug(shopSlug);
  if (!normalized) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}shop=${encodeURIComponent(normalized)}`;
}

export function buildSignInRedirectPath(
  targetPath: string,
  shopSlug: string | null | undefined,
): string {
  const destination = appendShopParam(
    sanitizeInternalRedirectTarget(targetPath, "/"),
    shopSlug,
  );
  return `/auth/sign-in?redirect=${encodeURIComponent(destination)}`;
}

export function resolveSignInRedirectTarget(
  searchParams: SearchParamsLike | null | undefined,
  fallbackPath = "/",
): string {
  return sanitizeInternalRedirectTarget(searchParams?.get("redirect"), fallbackPath);
}

export function getCurrentInternalPathWithQuery(fallbackPath = "/"): string {
  if (typeof window === "undefined") {
    return sanitizeInternalRedirectTarget(fallbackPath, "/");
  }

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return sanitizeInternalRedirectTarget(current, fallbackPath);
}

export function buildSignInRedirectFromCurrentLocation(fallbackPath = "/"): string {
  const destination = getCurrentInternalPathWithQuery(fallbackPath);
  return `/auth/sign-in?redirect=${encodeURIComponent(destination)}`;
}
