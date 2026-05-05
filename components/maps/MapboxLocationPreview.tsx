"use client";

import React from "react";
import { searchMapboxPlaces } from "@/lib/mapbox/location";

const MAPBOX_SCRIPT_ID = "mapbox-gl-script";
const MAPBOX_STYLE_ID = "mapbox-gl-style";
const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];

interface MarkerLngLat {
  lng: number;
  lat: number;
}

interface MapMouseEventLike {
  lngLat?: MarkerLngLat;
}

interface MarkerLike {
  setLngLat: (coordinates: [number, number]) => MarkerLike;
  addTo: (map: MapLike) => MarkerLike;
  remove?: () => void;
}

interface MapLike {
  doubleClickZoom?: { disable: () => void };
  on: (event: "load" | "error" | "dblclick", callback: (event?: MapMouseEventLike) => void) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  remove?: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapLike;
  Marker: new (options?: Record<string, unknown>) => MarkerLike;
}

const getMapboxGl = (): MapboxGlLike | null =>
  (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl ?? null;

async function loadMapboxGl(): Promise<MapboxGlLike> {
  const existing = getMapboxGl();
  if (existing) return existing;

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Mapbox script failed to load")), { once: true });
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
  if (!loaded) throw new Error("Mapbox global not found");
  return loaded;
}

function toCoordinates(lat?: number | null, lng?: number | null): [number, number] | null {
  if (!Number.isFinite(lat ?? NaN) || !Number.isFinite(lng ?? NaN)) return null;
  return [Number(lng), Number(lat)];
}

interface MapboxLocationPreviewProps {
  query?: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  className?: string;
  fallbackText?: string;
  onMapDoubleClick?: (coordinates: { latitude: number; longitude: number }) => void;
}

export function MapboxLocationPreview({
  query,
  defaultLatitude,
  defaultLongitude,
  className,
  fallbackText,
  onMapDoubleClick,
}: MapboxLocationPreviewProps) {
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    "";

  const defaultCoordinates = React.useMemo(
    () => toCoordinates(defaultLatitude, defaultLongitude),
    [defaultLatitude, defaultLongitude],
  );

  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<MapLike | null>(null);
  const markerRef = React.useRef<MarkerLike | null>(null);
  const onMapDoubleClickRef = React.useRef(onMapDoubleClick);
  const [mapFailed, setMapFailed] = React.useState(false);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  React.useEffect(() => {
    onMapDoubleClickRef.current = onMapDoubleClick;
  }, [onMapDoubleClick]);

  const setMarkerAt = React.useCallback((coordinates: [number, number]) => {
    const map = mapRef.current;
    const mapboxgl = getMapboxGl();
    if (!map || !mapboxgl) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#7c3aed" })
        .setLngLat(coordinates)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.setCenter(coordinates);
  }, []);

  React.useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    void loadMapboxGl()
      .then((mapboxgl) => {
        if (disposed || !mapContainerRef.current) return;
        mapboxgl.accessToken = mapboxToken;

        const initialCenter = defaultCoordinates || FALLBACK_CENTER;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter,
          zoom: defaultCoordinates ? 14 : 10,
        });

        mapRef.current = map;
        map.doubleClickZoom?.disable();

        map.on("dblclick", (event) => {
          if (disposed || !event?.lngLat) return;
          const longitude = Number(event.lngLat.lng);
          const latitude = Number(event.lngLat.lat);
          if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
          setMarkerAt([longitude, latitude]);
          onMapDoubleClickRef.current?.({ latitude, longitude });
        });

        map.on("load", () => {
          if (disposed) return;
          setMapLoaded(true);
          if (defaultCoordinates) {
            setMarkerAt(defaultCoordinates);
          }
        });

        map.on("error", () => {
          if (disposed) return;
          setMapFailed(true);
        });
      })
      .catch(() => {
        if (disposed) return;
        setMapFailed(true);
      });

    return () => {
      disposed = true;
      markerRef.current?.remove?.();
      markerRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [defaultCoordinates, mapboxToken, setMarkerAt]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (defaultCoordinates) {
      setMarkerAt(defaultCoordinates);
      map.setZoom(14);
    } else {
      markerRef.current?.remove?.();
      markerRef.current = null;
      map.setCenter(FALLBACK_CENTER);
      map.setZoom(10);
    }
  }, [defaultCoordinates, mapLoaded, setMarkerAt]);

  React.useEffect(() => {
    const trimmedQuery = (query ?? "").trim();
    const map = mapRef.current;
    // Skip text geocoding when we already have precise saved coordinates — the
    // geocoded centroid of an address string is less accurate than the stored point.
    if (!map || !mapLoaded || !trimmedQuery || !mapboxToken || defaultCoordinates) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchMapboxPlaces(trimmedQuery, mapboxToken)
        .then((results) => {
          if (cancelled) return;
          const match = results.find(
            (item) => Array.isArray(item.center) && item.center.length === 2,
          );
          if (!match?.center) return;
          const [lng, lat] = match.center;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          setMarkerAt([lng, lat]);
          map.setZoom(15);
        })
        .catch(() => {
          // Keep default center when geocoding fails.
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapLoaded, mapboxToken, query, setMarkerAt]);

  if (!mapboxToken || mapFailed) {
    return (
      <div className={`flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500 ${className || "h-48"}`}>
        {fallbackText || "Map unavailable"}
      </div>
    );
  }

  return <div ref={mapContainerRef} className={className} />;
}
