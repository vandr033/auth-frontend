"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { ShopCommercePointOfSale } from "@/types/shop";

const MAPBOX_SCRIPT_ID = "mapbox-gl-script";
const MAPBOX_STYLE_ID = "mapbox-gl-style";
const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];

interface MapboxMarkerLike {
  setLngLat: (coordinates: [number, number]) => MapboxMarkerLike;
  addTo: (map: MapboxMapLike) => MapboxMarkerLike;
  remove?: () => void;
}

interface MapboxMapLike {
  on: (event: "load" | "error", callback: () => void) => void;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  remove?: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options?: Record<string, unknown>) => MapboxMarkerLike;
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

type ShopPointsOfSaleMapProps = {
  points: ShopCommercePointOfSale[];
  className?: string;
  fallback?: ReactNode;
};

export function ShopPointsOfSaleMap({ points, className, fallback }: ShopPointsOfSaleMapProps) {
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    "";

  const coordinates = useMemo(
    () =>
      points
        .map((point) => [point.longitude, point.latitude] as [number, number])
        .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat)),
    [points],
  );

  const initialCenter = useMemo<[number, number]>(() => {
    if (coordinates.length === 0) return FALLBACK_CENTER;
    const lng = coordinates.reduce((sum, [value]) => sum + value, 0) / coordinates.length;
    const lat = coordinates.reduce((sum, [, value]) => sum + value, 0) / coordinates.length;
    return [lng, lat];
  }, [coordinates]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const markersRef = useRef<MapboxMarkerLike[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    void loadMapboxGl()
      .then((mapboxgl) => {
        if (disposed || !mapContainerRef.current) return;
        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: initialCenter,
          zoom: coordinates.length > 1 ? 11 : 14,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (disposed) return;
          markersRef.current = coordinates.map((point) =>
            new mapboxgl.Marker({ color: "#0f766e" }).setLngLat(point).addTo(map),
          );
        });

        map.on("error", () => {
          if (!disposed) setFailed(true);
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      markersRef.current.forEach((marker) => marker.remove?.());
      markersRef.current = [];
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [coordinates, initialCenter, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setCenter(initialCenter);
    map.setZoom(coordinates.length > 1 ? 11 : 14);
  }, [coordinates.length, initialCenter]);

  if (!mapboxToken || failed) {
    return <>{fallback ?? null}</>;
  }

  return <div ref={mapContainerRef} className={className} />;
}
