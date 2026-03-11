"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ShopCompany } from "@/types/shop";

const MAPBOX_SCRIPT_ID = "mapbox-gl-script";
const MAPBOX_STYLE_ID = "mapbox-gl-style";
const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];

interface ShopLocationMapProps {
  company: ShopCompany;
  className?: string;
  fallback?: ReactNode;
}

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

function parseCoordinates(company: ShopCompany): [number, number] | null {
  const latitude = Number(company.latitude);
  const longitude = Number(company.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return [longitude, latitude];
}

export function ShopLocationMap({ company, className, fallback }: ShopLocationMapProps) {
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    "";

  const coordinates = useMemo(() => parseCoordinates(company), [company]);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const markerRef = useRef<MapboxMarkerLike | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;

    void loadMapboxGl()
      .then((mapboxgl) => {
        if (disposed || !mapContainerRef.current) return;

        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: coordinates || FALLBACK_CENTER,
          zoom: coordinates ? 14 : 10,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (disposed) return;

          if (coordinates) {
            markerRef.current = new mapboxgl.Marker({ color: "#7c3aed" })
              .setLngLat(coordinates)
              .addTo(map);
          }
        });

        map.on("error", () => {
          if (disposed) return;
          setFailed(true);
        });
      })
      .catch(() => {
        if (disposed) return;
        setFailed(true);
      });

    return () => {
      disposed = true;
      markerRef.current?.remove?.();
      markerRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [coordinates, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = getMapboxGl();
    if (!map || !mapboxgl) return;

    if (!coordinates) {
      markerRef.current?.remove?.();
      markerRef.current = null;
      map.setCenter(FALLBACK_CENTER);
      map.setZoom(10);
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#7c3aed" })
        .setLngLat(coordinates)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.setCenter(coordinates);
    map.setZoom(14);
  }, [coordinates]);

  if (!mapboxToken || failed) {
    return <>{fallback ?? null}</>;
  }

  return <div ref={mapContainerRef} className={className} />;
}
