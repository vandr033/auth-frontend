"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  searchMapboxPlaces,
  type LocationSource,
  type MapboxFeature,
} from "@/lib/mapbox/location";

const MAPBOX_SCRIPT_ID = "mapbox-gl-script";
const MAPBOX_STYLE_ID = "mapbox-gl-style";
const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];

interface MarkerLngLat {
  lng: number;
  lat: number;
}

interface MapboxMarkerLike {
  setLngLat: (coords: [number, number]) => MapboxMarkerLike;
  addTo: (map: MapboxMapLike) => MapboxMarkerLike;
  on: (event: "dragend", callback: () => void) => void;
  getLngLat: () => MarkerLngLat;
  remove?: () => void;
}

interface MapboxMapLike {
  flyTo: (options: Record<string, unknown>) => void;
  setCenter: (center: [number, number]) => void;
  doubleClickZoom: { disable: () => void };
  on: (event: string, callback: (event?: { lngLat?: MarkerLngLat }) => void) => void;
  remove?: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options?: Record<string, unknown>) => MapboxMarkerLike;
}

const getMapboxGl = (): MapboxGlLike | null =>
  (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl ?? null;

interface LocationPickerText {
  searchLabel: string;
  searchPlaceholder: string;
  helperText: string;
  searchLoadingText: string;
  searchErrorText: string;
  noResultsText: string;
  reverseGeocodeLoadingText: string;
  reverseGeocodeErrorText: string;
  mapUnavailableText: string;
  missingTokenText: string;
}

export interface LocationPickerValue {
  address: string;
  city: string;
  stateRegion: string;
  countryCode: string;
  timezone: string;
  latitude: string;
  longitude: string;
}

export interface LocationAutofillUpdate {
  fields: Partial<LocationPickerValue>;
  locationSource: LocationSource;
  formattedAddress?: string;
  mapboxPlaceId?: string;
}

interface LocationPickerProps {
  value: LocationPickerValue;
  text: LocationPickerText;
  onLocationAutofill: (update: LocationAutofillUpdate) => void;
  mapboxToken?: string;
}

function toCoordinateString(value: number): string {
  return value.toFixed(6);
}

function parseCoordinate(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadMapboxGl(): Promise<MapboxGlLike> {
  const existing = getMapboxGl();
  if (existing) {
    return existing;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Mapbox script failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = MAPBOX_SCRIPT_ID;
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.1/mapbox-gl.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mapbox script failed to load"));
    document.head.appendChild(script);
  });

  if (!document.getElementById(MAPBOX_STYLE_ID)) {
    const link = document.createElement("link");
    link.id = MAPBOX_STYLE_ID;
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.1/mapbox-gl.css";
    document.head.appendChild(link);
  }

  const loaded = getMapboxGl();
  if (!loaded) {
    throw new Error("Mapbox global not found");
  }

  return loaded;
}

export function LocationPicker({ value, text, onLocationAutofill, mapboxToken }: LocationPickerProps) {
  // Configure this token in reservas-front/.env as NEXT_PUBLIC_MAPBOX_TOKEN.
  const resolvedToken =
    mapboxToken?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    "";

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const markerRef = useRef<MapboxMarkerLike | null>(null);

  const currentCoordinates = useMemo<[number, number] | null>(() => {
    const lat = parseCoordinate(value.latitude);
    const lng = parseCoordinate(value.longitude);
    if (lat === null || lng === null) return null;
    return [lng, lat];
  }, [value.latitude, value.longitude]);
  const initialCoordinatesRef = useRef<[number, number] | null>(currentCoordinates);

  const handleMarkerDragEndRef = useRef<() => Promise<void>>(async () => undefined);

  const upsertMarker = useCallback((coords: [number, number], flyTo = true) => {
    const map = mapRef.current;
    const mapboxgl = getMapboxGl();
    if (!map || !mapboxgl) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true, color: "#7c3aed" })
        .setLngLat(coords)
        .addTo(map);

      markerRef.current.on("dragend", () => {
        void handleMarkerDragEndRef.current();
      });
    } else {
      markerRef.current.setLngLat(coords);
    }

    if (flyTo) {
      map.flyTo({ center: coords, zoom: 15, essential: true });
    }
  }, []);

  const applyFeature = useCallback(
    (feature: MapboxFeature, source: LocationSource, options?: { preserveCoordinates?: boolean }) => {
      const parsed = parseMapboxFeature(feature);
      if (!parsed) return;

      const fields: Partial<LocationPickerValue> = {};
      if (!options?.preserveCoordinates) {
        fields.latitude = toCoordinateString(parsed.latitude);
        fields.longitude = toCoordinateString(parsed.longitude);
      }

      if (parsed.address) fields.address = parsed.address;
      if (parsed.city) fields.city = parsed.city;
      if (parsed.stateRegion) fields.stateRegion = parsed.stateRegion;
      if (parsed.countryCode) fields.countryCode = parsed.countryCode;
      if (parsed.timezone) fields.timezone = parsed.timezone;

      onLocationAutofill({
        fields,
        locationSource: source,
        formattedAddress: parsed.formattedAddress,
        mapboxPlaceId: parsed.mapboxPlaceId,
      });
    },
    [onLocationAutofill],
  );

  const applyCoordinatesWithReverseGeocode = useCallback(
    async (longitude: number, latitude: number, source: LocationSource) => {
      if (!resolvedToken) return;
      onLocationAutofill({
        fields: {
          latitude: toCoordinateString(latitude),
          longitude: toCoordinateString(longitude),
        },
        locationSource: source,
      });

      setReverseLoading(true);
      setReverseError(null);

      try {
        const result = await reverseGeocodeMapbox(longitude, latitude, resolvedToken);
        if (!result) {
          setReverseError(text.noResultsText);
          return;
        }

        applyFeature(result, source, { preserveCoordinates: true });
        setSearchQuery(result.place_name || "");
      } catch {
        setReverseError(text.reverseGeocodeErrorText);
      } finally {
        setReverseLoading(false);
      }
    },
    [applyFeature, onLocationAutofill, resolvedToken, text.noResultsText, text.reverseGeocodeErrorText],
  );

  const handleMarkerDragEnd = useCallback(async () => {
    const marker = markerRef.current;
    if (!marker || !resolvedToken) return;

    const lngLat = marker.getLngLat?.();
    if (!lngLat) return;

    const longitude = Number(lngLat.lng);
    const latitude = Number(lngLat.lat);
    await applyCoordinatesWithReverseGeocode(longitude, latitude, "pin_drag");
  }, [applyCoordinatesWithReverseGeocode, resolvedToken]);

  handleMarkerDragEndRef.current = handleMarkerDragEnd;

  useEffect(() => {
    if (!resolvedToken) {
      setMapError(text.missingTokenText);
      return;
    }

    if (!mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    setMapLoading(true);
    setMapError(null);

    void loadMapboxGl()
      .then((mapboxgl) => {
        if (disposed || !mapContainerRef.current) return;

        mapboxgl.accessToken = resolvedToken;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCoordinatesRef.current || FALLBACK_CENTER,
          zoom: initialCoordinatesRef.current ? 14 : 10,
        });

        mapRef.current = map;
        map.doubleClickZoom.disable();

        map.on("dblclick", (event?: { lngLat?: MarkerLngLat }) => {
          const longitude = Number(event?.lngLat?.lng);
          const latitude = Number(event?.lngLat?.lat);
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

          upsertMarker([longitude, latitude], false);
          void applyCoordinatesWithReverseGeocode(longitude, latitude, "pin_drag");
        });

        map.on("load", () => {
          if (disposed) return;
          setMapLoading(false);

          if (initialCoordinatesRef.current) {
            upsertMarker(initialCoordinatesRef.current, false);
          }
        });

        map.on("error", () => {
          if (disposed) return;
          setMapLoading(false);
          setMapError(text.mapUnavailableText);
        });
      })
      .catch(() => {
        if (disposed) return;
        setMapLoading(false);
        setMapError(text.mapUnavailableText);
      });

    return () => {
      disposed = true;
      markerRef.current?.remove?.();
      markerRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [applyCoordinatesWithReverseGeocode, resolvedToken, text.mapUnavailableText, text.missingTokenText, upsertMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentCoordinates) {
      markerRef.current?.remove?.();
      markerRef.current = null;
      map.flyTo({ center: FALLBACK_CENTER, zoom: 10, essential: true });
      return;
    }

    upsertMarker(currentCoordinates, false);
    map.setCenter(currentCoordinates);
  }, [currentCoordinates, upsertMarker]);

  useEffect(() => {
    if (!resolvedToken) return;

    const query = searchQuery.trim();
    if (query.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const found = await searchMapboxPlaces(query, resolvedToken);
        if (cancelled) return;
        setResults(found);
        setShowResults(true);
      } catch {
        if (cancelled) return;
        setResults([]);
        setSearchError(text.searchErrorText);
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [resolvedToken, searchQuery, text.searchErrorText]);

  const handleSelectResult = (feature: MapboxFeature) => {
    setShowResults(false);
    setResults([]);
    setSearchQuery(feature.place_name || feature.text || "");
    setSearchError(null);

    applyFeature(feature, "search");

    if (feature.center?.length === 2) {
      upsertMarker(feature.center, true);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
    setShowResults(false);
    setSearchError(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="shop-location-search">{text.searchLabel}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="shop-location-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => {
              if (results.length > 0) {
                setShowResults(true);
              }
            }}
            placeholder={text.searchPlaceholder}
            className="pl-9 pr-10"
            disabled={!resolvedToken}
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-500"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500">{text.helperText}</p>

        {searchLoading && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            {text.searchLoadingText}
          </p>
        )}

        {searchError && <p className="text-xs text-red-600">{searchError}</p>}

        {!searchLoading &&
          showResults &&
          searchQuery.trim().length >= 3 &&
          results.length === 0 &&
          !searchError && <p className="text-xs text-slate-500">{text.noResultsText}</p>}

        {showResults && results.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white">
            {results.map((result) => (
              <button
                key={result.id || `${result.place_name}-${result.center?.join(",")}`}
                type="button"
                className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-b-0"
                onClick={() => handleSelectResult(result)}
              >
                {result.place_name || result.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
        <div ref={mapContainerRef} className="h-64 w-full" />

        {mapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {text.searchLoadingText}
          </div>
        )}

        {(!resolvedToken || mapError) && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-slate-600">
            {mapError || text.mapUnavailableText}
          </div>
        )}
      </div>

      {reverseLoading && (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          {text.reverseGeocodeLoadingText}
        </p>
      )}

      {reverseError && <p className="text-xs text-red-600">{reverseError}</p>}
    </div>
  );
}
