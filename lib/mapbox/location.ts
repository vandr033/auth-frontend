export type LocationSource = "search" | "pin_drag" | "manual";

export interface MapboxContextItem {
  id?: string;
  text?: string;
  short_code?: string;
}

export interface MapboxFeature {
  id?: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
  address?: string;
  place_type?: string[];
  context?: MapboxContextItem[];
  properties?: {
    short_code?: string;
  };
}

export interface ParsedMapboxLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
  timezone?: string;
  formattedAddress?: string;
  mapboxPlaceId?: string;
}

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  AR: "America/Buenos_Aires",
  BO: "America/La_Paz",
  BR: "America/Sao_Paulo",
  CL: "America/Santiago",
  CO: "America/Bogota",
  EC: "America/Guayaquil",
  PE: "America/Lima",
  PY: "America/Asuncion",
  UY: "America/Montevideo",
};

function getContextItem(feature: MapboxFeature, prefixes: string[]): MapboxContextItem | undefined {
  return feature.context?.find((item) => {
    if (!item.id) return false;
    return prefixes.some((prefix) => item.id?.startsWith(prefix));
  });
}

function toCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const normalized = code.includes("-") ? code.split("-").pop() : code;
  return normalized?.toUpperCase();
}

function getCountryCode(feature: MapboxFeature): string | undefined {
  const country = getContextItem(feature, ["country"]);
  return toCountryCode(country?.short_code || feature.properties?.short_code);
}

export function getTimezoneFromCountry(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  return COUNTRY_TIMEZONE_MAP[countryCode.toUpperCase()];
}

export function parseMapboxFeature(feature: MapboxFeature): ParsedMapboxLocation | null {
  if (!feature.center || feature.center.length !== 2) {
    return null;
  }

  const [longitude, latitude] = feature.center;
  const city =
    getContextItem(feature, ["place"])?.text ||
    getContextItem(feature, ["locality"])?.text ||
    getContextItem(feature, ["district"])?.text;
  const stateRegion =
    getContextItem(feature, ["region"])?.text ||
    getContextItem(feature, ["district"])?.text;
  const countryCode = getCountryCode(feature);

  const houseNumber = feature.address?.trim();
  const street = feature.text?.trim();
  const line1 =
    houseNumber && street
      ? `${street} ${houseNumber}`
      : street || houseNumber || feature.place_name?.split(",")[0]?.trim();

  return {
    latitude,
    longitude,
    address: line1,
    city,
    stateRegion,
    countryCode,
    timezone: getTimezoneFromCountry(countryCode),
    formattedAddress: feature.place_name,
    mapboxPlaceId: feature.id,
  };
}

export async function searchMapboxPlaces(query: string, token: string): Promise<MapboxFeature[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${encodeURIComponent(
    token,
  )}&autocomplete=true&limit=6&language=es,en&types=address,place,locality,neighborhood,poi`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox search failed (${response.status})`);
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  return data.features ?? [];
}

export async function reverseGeocodeMapbox(lng: number, lat: number, token: string): Promise<MapboxFeature | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    `${lng},${lat}`,
  )}.json?access_token=${encodeURIComponent(token)}&limit=1&language=es,en&types=address,place,locality,district,region,country`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox reverse geocode failed (${response.status})`);
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  return data.features?.[0] ?? null;
}
