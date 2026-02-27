type SearchParamsLike = {
  get: (name: string) => string | null;
};

const SHOP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  const destination = appendShopParam(targetPath, shopSlug);
  return `/auth/sign-in?redirect=${encodeURIComponent(destination)}`;
}
