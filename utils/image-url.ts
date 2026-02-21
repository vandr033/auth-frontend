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

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // If already a full URL, return as-is (for backwards compatibility)
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;

  // If it's an API path, prepend base URL
  if (path.startsWith('/api/')) {
    return `${API_BASE}${path}`;
  }

  // If it's a relative storage path, construct API URL
  if (path.startsWith('/storage/')) {
    return `${API_BASE}/api${path}`;
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
