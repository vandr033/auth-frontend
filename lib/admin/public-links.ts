export function buildPublicEventPath(companySlug: string, eventId: number): string {
  return `/shop/${encodeURIComponent(companySlug)}/events/${eventId}`;
}

export function buildPublicClassPath(companySlug: string, classId: number): string {
  return `/shop/${encodeURIComponent(companySlug)}/classes/${classId}`;
}

export function buildPublicServicePath(companySlug: string, serviceId: number): string {
  return `/shop/${encodeURIComponent(companySlug)}/book?serviceId=${serviceId}`;
}

export function buildPublicStoreProductPath(companySlug: string, productSlug: string): string {
  return `/shop/${encodeURIComponent(companySlug)}/store/${encodeURIComponent(productSlug)}`;
}

export function toAbsolutePublicUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export async function copyPublicUrl(path: string): Promise<void> {
  await navigator.clipboard.writeText(toAbsolutePublicUrl(path));
}
