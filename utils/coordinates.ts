export type CoordinateValue = number | string | null | undefined;

function parseCoordinate(value: CoordinateValue, minimum: number, maximum: number): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'string' && /^(null|undefined|nan)$/i.test(value.trim())) return null;

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) return null;
  return parsed;
}

export function getValidCoordinates(latitude: CoordinateValue, longitude: CoordinateValue): {
  latitude: number;
  longitude: number;
} | null {
  const parsedLatitude = parseCoordinate(latitude, -90, 90);
  const parsedLongitude = parseCoordinate(longitude, -180, 180);
  if (parsedLatitude === null || parsedLongitude === null) return null;
  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function buildGoogleMapsQueryUrl(params: {
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  address?: string | null;
  mode?: 'search' | 'directions';
}): string | null {
  const coordinates = getValidCoordinates(params.latitude, params.longitude);
  const address = params.address?.trim();
  const usableAddress = address && !/^(null|undefined|nan)$/i.test(address) ? address : null;
  const query = coordinates ? `${coordinates.latitude},${coordinates.longitude}` : usableAddress;
  if (!query) return null;

  const endpoint = params.mode === 'directions' ? 'dir' : 'search';
  const parameter = params.mode === 'directions' ? 'destination' : 'query';
  return `https://www.google.com/maps/${endpoint}/?api=1&${parameter}=${encodeURIComponent(query)}`;
}

export function getSafeMapUrl(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    if (!trimmed || /^(null|undefined|nan)$/i.test(trimmed)) return null;
    try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}
