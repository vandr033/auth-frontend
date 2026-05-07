import * as React from "react";

import { parseMapboxFeature, reverseGeocodeMapbox } from "@/lib/mapbox/location";

export type PointOfSaleLocationInput = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type ResolvedPointOfSaleLocation = {
  city: string | null;
  countryCode: string | null;
  countryLabel: string | null;
};

export type PointOfSaleCityGroup<TPoint> = {
  key: string;
  label: string;
  isFallback: boolean;
  points: TPoint[];
};

export type PointOfSaleCountryGroup<TPoint> = {
  key: string;
  label: string;
  countryCode: string | null;
  isFallback: boolean;
  cities: PointOfSaleCityGroup<TPoint>[];
};

type GroupFallbackLabels = {
  city: string;
  country: string;
};

const pointOfSaleLocationCache = new Map<string, ResolvedPointOfSaleLocation>();

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildCacheKey(point: PointOfSaleLocationInput) {
  return `${point.latitude}:${point.longitude}:${point.address.trim().toLowerCase()}`;
}

function getCountryLabel(countryCode: string | null, locale: string) {
  if (!countryCode) return null;

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

function inferLocationFromAddress(
  point: PointOfSaleLocationInput,
  locale: string,
): ResolvedPointOfSaleLocation {
  const segments = point.address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const city = segments.length >= 2 ? normalizeText(segments[segments.length - 2]) : null;
  const rawCountry = normalizeText(segments.length >= 1 ? segments[segments.length - 1] : null);
  const countryCode =
    rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;

  return {
    city,
    countryCode,
    countryLabel: getCountryLabel(countryCode, locale),
  };
}

async function resolvePointOfSaleLocation(
  point: PointOfSaleLocationInput,
  locale: string,
  mapboxToken: string,
): Promise<ResolvedPointOfSaleLocation> {
  const cacheKey = buildCacheKey(point);
  const cached = pointOfSaleLocationCache.get(cacheKey);
  if (cached) return cached;

  if (mapboxToken && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
    try {
      const feature = await reverseGeocodeMapbox(point.longitude, point.latitude, mapboxToken);
      const parsed = feature ? parseMapboxFeature(feature) : null;

      if (parsed?.city || parsed?.countryCode) {
        const resolved = {
          city: normalizeText(parsed.city),
          countryCode: normalizeText(parsed.countryCode)?.toUpperCase() ?? null,
          countryLabel: getCountryLabel(
            normalizeText(parsed.countryCode)?.toUpperCase() ?? null,
            locale,
          ),
        };
        pointOfSaleLocationCache.set(cacheKey, resolved);
        return resolved;
      }
    } catch {
      // Fall back to address-based grouping when geocoding is unavailable.
    }
  }

  const fallback = inferLocationFromAddress(point, locale);
  pointOfSaleLocationCache.set(cacheKey, fallback);
  return fallback;
}

export function useResolvedPointOfSaleLocations<TPoint extends PointOfSaleLocationInput>(
  points: TPoint[],
  locale: string,
) {
  const [locationsById, setLocationsById] = React.useState<
    Record<string, ResolvedPointOfSaleLocation>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    const mapboxToken =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
      "";

    const run = async () => {
      const entries = await Promise.all(
        points.map(async (point) => [
          point.id,
          await resolvePointOfSaleLocation(point, locale, mapboxToken),
        ] as const),
      );

      if (cancelled) return;
      setLocationsById(Object.fromEntries(entries));
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [locale, points]);

  return locationsById;
}

export function groupPointsOfSaleByLocation<TPoint extends PointOfSaleLocationInput>(
  points: TPoint[],
  locationsById: Record<string, ResolvedPointOfSaleLocation>,
  fallbackLabels: GroupFallbackLabels,
) {
  const countryMap = new Map<
    string,
    {
      label: string;
      isFallback: boolean;
      countryCode: string | null;
      cities: Map<string, PointOfSaleCityGroup<TPoint>>;
    }
  >();

  for (const point of points) {
    const location = locationsById[point.id];
    const countryCode = location?.countryCode ?? null;
    const countryLabel = location?.countryLabel ?? fallbackLabels.country;
    const cityLabel = location?.city ?? fallbackLabels.city;
    const countryKey = countryCode ?? "__fallback_country__";
    const cityKey = normalizeText(location?.city)?.toLowerCase() ?? "__fallback_city__";

    if (!countryMap.has(countryKey)) {
      countryMap.set(countryKey, {
        label: countryLabel,
        isFallback: !countryCode,
        countryCode,
        cities: new Map(),
      });
    }

    const countryGroup = countryMap.get(countryKey)!;

    if (!countryGroup.cities.has(cityKey)) {
      countryGroup.cities.set(cityKey, {
        key: cityKey,
        label: cityLabel,
        isFallback: !location?.city,
        points: [],
      });
    }

    countryGroup.cities.get(cityKey)!.points.push(point);
  }

  const compareByLabel = <TGroup extends { label: string; isFallback: boolean }>(
    left: TGroup,
    right: TGroup,
  ) => {
    if (left.isFallback !== right.isFallback) {
      return left.isFallback ? 1 : -1;
    }
    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
  };

  return Array.from(countryMap.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      countryCode: value.countryCode,
      isFallback: value.isFallback,
      cities: Array.from(value.cities.values())
        .map((cityGroup) => ({
          ...cityGroup,
          points: [...cityGroup.points].sort((left, right) =>
            left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
          ),
        }))
        .sort(compareByLabel),
    }))
    .sort(compareByLabel);
}
