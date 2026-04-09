/**
 * All images are served through the backend API.
 * This helper constructs the correct URL for any image type.
 */

// Get base URL without /api suffix (handle both formats)
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
  // Remove trailing /api if present to avoid double /api/api
  return url.replace(/\/api\/?$/, '');
}

const API_BASE = getBaseUrl();
const API_ORIGIN = (() => {
  if (!API_BASE) return '';
  try {
    return new URL(API_BASE).origin;
  } catch {
    return '';
  }
})();

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function looksLikeImageFile(value: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg)(?:\?.*)?$/i.test(value);
}

function normalizeImagePath(path: string): string {
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/storage/')) return `/api${path}`;
  if (looksLikeImageFile(path) && /^\/[^/]+\.[a-z0-9]+$/i.test(path)) {
    return `/api/storage${path}`;
  }
  return path;
}

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Preserve non-http URL schemes as-is.
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;

  // Normalize absolute URLs, rewriting localhost URLs to the configured API origin in production.
  // Also rewrite any absolute URL whose path looks like an API path but uses the wrong origin.
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const parsed = new URL(path);
      if (API_ORIGIN && parsed.origin !== API_ORIGIN) {
        if (isLocalhostHost(parsed.hostname) || parsed.pathname.startsWith('/api/')) {
          const normalizedPath = isLocalhostHost(parsed.hostname)
            ? normalizeImagePath(parsed.pathname)
            : parsed.pathname;
          return `${API_ORIGIN}${normalizedPath}${parsed.search}${parsed.hash}`;
        }
      }
      return path;
    } catch {
      return path;
    }
  }

  // If it's an API path, prepend base URL
  if (path.startsWith('/api/')) {
    return `${API_BASE}${path}`;
  }

  // If it's a relative storage path, construct API URL
  if (path.startsWith('/storage/')) {
    return `${API_BASE}/api${path}`;
  }

  // If only a filename/storage key is saved (e.g. "home.jpeg"), serve from /api/storage.
  if (!path.startsWith('/') && looksLikeImageFile(path)) {
    return `${API_BASE}/api/storage/${path}`;
  }

  // For any other path, assume it needs the API base
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export type CompanyImageType = 'logo' | 'hero_home' | 'hero_about' | 'about_1' | 'about_2' | 'about_3' | 'qr';

export function getCompanyImageUrl(
  companyId: number,
  type: CompanyImageType,
  filename: string
): string {
  const typeMap: Record<CompanyImageType, string> = {
    logo: 'logo',
    hero_home: 'hero',
    hero_about: 'hero',
    about_1: 'about',
    about_2: 'about',
    about_3: 'about',
    qr: 'qr'
  };
  return `${API_BASE}/api/uploads/company/${companyId}/${typeMap[type]}/${filename}`;
}

export function getStaffImageUrl(companyId: number, staffId: number, ext: string = 'jpg'): string {
  return `${API_BASE}/api/uploads/company/${companyId}/staff/${staffId}.${ext}`;
}

export function getUploadEndpoint(): string {
  return `${API_BASE}/api/admin/uploads/image`;
}
