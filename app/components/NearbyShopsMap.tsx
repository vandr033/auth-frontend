"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { getMapboxToken, loadMapboxGl } from "@/lib/mapbox/loadMapboxGl";

interface NearbyShop {
  name: string;
  slug: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  totalStars: number;
  numberOfReviews: number;
  category: string | null;
  serviceName: string | null;
  servicePriceCents: number | null;
}

interface MapboxMapLike {
  on: {
    (event: string, callback: (...args: unknown[]) => void): void;
    (event: string, layerId: string, callback: (...args: unknown[]) => void): void;
  };
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  getSource: (id: string) => { setData?: (data: unknown) => void } | undefined;
  fitBounds: (
    bounds: [[number, number], [number, number]] | { extend: (coords: [number, number]) => unknown },
    options?: Record<string, unknown>,
  ) => void;
  easeTo: (options: Record<string, unknown>) => void;
  getCanvas: () => HTMLCanvasElement;
  remove: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options?: Record<string, unknown>) => {
    setLngLat: (coords: [number, number]) => { addTo: (map: MapboxMapLike) => unknown };
  };
  LngLatBounds: new (
    sw: [number, number],
    ne: [number, number],
  ) => { extend: (coords: [number, number]) => unknown };
}

const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function NearbyShopsMap() {
  const t = useT();
  const api = useApi();
  const prefersReducedMotion = useReducedMotion();
  const mapToken = getMapboxToken();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Auto-request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    // Check if permission is already granted
    void navigator.permissions?.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        requestLocation();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(() => {
    setLocationRequested(true);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationDenied(false);
      },
      () => {
        setLocationDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  // Fetch nearby shops when location is available
  useEffect(() => {
    if (!userLocation) return;

    let cancelled = false;
    setLoading(true);

    void api
      .get<{ error?: boolean; data?: NearbyShop[] }>(
        `/home/search?location=${encodeURIComponent("")}`,
      )
      .then((response) => {
        if (cancelled) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        // Filter to shops that have lat/lng
        const withCoords = rows.filter(
          (s): s is NearbyShop & { lat: number; lng: number } =>
            typeof s.lat === "number" && typeof s.lng === "number",
        );

        // Sort by distance from user
        withCoords.sort((a, b) => {
          const distA = Math.hypot(a.lat - userLocation.lat, a.lng - userLocation.lng);
          const distB = Math.hypot(b.lat - userLocation.lat, b.lng - userLocation.lng);
          return distA - distB;
        });

        setShops(withCoords.slice(0, 20));
      })
      .catch(() => {
        if (!cancelled) setShops([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, userLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapToken || !mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    void loadMapboxGl()
      .then((mapboxModule) => {
        if (disposed || !mapContainerRef.current) return;
        const mapboxgl = mapboxModule as MapboxGlLike;
        mapboxgl.accessToken = mapToken;

        const center: [number, number] = userLocation
          ? [userLocation.lng, userLocation.lat]
          : FALLBACK_CENTER;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom: 12,
          attributionControl: false,
          interactive: true,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (disposed) return;
          setMapReady(true);

          // User location marker
          if (userLocation) {
            const el = document.createElement("div");
            el.className = "nearby-user-pulse";
            el.style.cssText =
              "width:16px;height:16px;background:#e73886;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(231,56,134,0.25);";
            new mapboxgl.Marker({ element: el })
              .setLngLat([userLocation.lng, userLocation.lat])
              .addTo(map);
          }

          // Shop pins source
          map.addSource("nearby-shops", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          map.addLayer({
            id: "nearby-shops-points",
            type: "circle",
            source: "nearby-shops",
            paint: {
              "circle-color": "#050505",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-radius": 7,
            },
          });

          // Click handler
          map.on("click", "nearby-shops-points", ((...args: unknown[]) => {
            const event = args[0] as { features?: Array<{ properties?: Record<string, unknown>; geometry: { coordinates: [number, number] } }> } | undefined;
            const feature = event?.features?.[0];
            if (!feature) return;
            const slug = String(feature.properties?.slug || "");
            if (slug) {
              window.location.href = `/shop/${encodeURIComponent(slug)}`;
            }
          }));

          map.on("mouseenter", "nearby-shops-points", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "nearby-shops-points", () => {
            map.getCanvas().style.cursor = "";
          });
        });
      })
      .catch(() => {
        /* map load failed, degrade gracefully */
      });

    return () => {
      disposed = true;
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapToken, userLocation]);

  // Update map data when shops change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const features = shops
      .filter((s) => s.lat !== null && s.lng !== null)
      .map((s) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [s.lng!, s.lat!] as [number, number],
        },
        properties: {
          name: s.name,
          slug: s.slug,
          category: s.category || "",
          rating: s.totalStars,
        },
      }));

    const source = map.getSource("nearby-shops");
    if (source?.setData) {
      source.setData({ type: "FeatureCollection", features });
    }

    // Fit bounds to include user + all shops
    if (features.length > 0 && userLocation) {
      try {
        const mapboxgl = (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl;
        if (mapboxgl) {
          const bounds = new mapboxgl.LngLatBounds(
            [userLocation.lng, userLocation.lat],
            [userLocation.lng, userLocation.lat],
          );
          for (const f of features) {
            bounds.extend(f.geometry.coordinates);
          }
          map.fitBounds(bounds as unknown as [[number, number], [number, number]], {
            padding: 60,
            duration: 400,
            maxZoom: 14,
          });
        }
      } catch {
        /* bounds fit failed */
      }
    }
  }, [shops, mapReady, userLocation]);

  if (!mapToken) return null;

  const shopsWithCoords = shops.filter((s) => s.lat !== null && s.lng !== null);

  return (
    <section className="w-full bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="inline-flex border-2 border-black px-2.5 py-1 font-bebas text-[13px] leading-none tracking-[0.14em] text-biz-barbie-pink uppercase">
                {t("homeRedesign.nearbyMap.eyebrow")}
              </p>
              <h2 className="mt-4 font-business-display text-[clamp(2.7rem,7vw,6.3rem)] leading-[0.84] font-black tracking-[-0.02em] text-black uppercase">
                <span className="block">{t("homeRedesign.nearbyMap.title1")}</span>
                <span className="block">{t("homeRedesign.nearbyMap.title2")}</span>
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="mb-2 text-[11px] leading-none font-semibold tracking-[0.1em] text-slate-600 uppercase transition-colors hover:text-black"
            >
              {t("homeRedesign.nearbyMap.viewAll")}
            </Link>
          </div>

          {/* Location prompt */}
          {!userLocation && !locationDenied && !locationRequested && (
            <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center">
              <Navigation className="h-8 w-8 text-biz-barbie-pink" />
              <p className="text-sm text-slate-600">
                {t("homeRedesign.nearbyMap.enableLocation")}
              </p>
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center justify-center border-2 border-black bg-black px-6 py-2.5 font-bebas text-[13px] leading-none tracking-[0.12em] text-white uppercase transition-colors hover:bg-slate-800"
              >
                {t("homeRedesign.nearbyMap.enableLocationButton")}
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="mt-8 flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("homeRedesign.nearbyMap.loading")}
            </div>
          )}

          {/* Map + results */}
          {!loading && userLocation && (
            <div className="mt-8">
              {shopsWithCoords.length > 0 && (
                <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-slate-500 uppercase">
                  {t("homeRedesign.nearbyMap.shopCount", { count: shopsWithCoords.length })}
                </p>
              )}

              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* Map */}
                <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:min-h-[480px]">
                  <div ref={mapContainerRef} className="absolute inset-0" />
                </div>

                {/* Side list */}
                <div className="max-h-[480px] space-y-2 overflow-y-auto">
                  {shopsWithCoords.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {t("homeRedesign.nearbyMap.noResults")}
                    </p>
                  ) : (
                    shopsWithCoords.map((shop) => (
                      <Link
                        key={shop.slug}
                        href={`/shop/${shop.slug}`}
                        className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bebas text-[15px] leading-tight tracking-tight text-black uppercase group-hover:text-biz-barbie-pink">
                            {shop.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] tracking-[0.04em] text-slate-500 uppercase">
                            {[shop.category, shop.city].filter(Boolean).join(" · ") || "—"}
                          </p>
                          {shop.totalStars > 0 && (
                            <p className="mt-1 text-[11px] font-semibold tracking-[0.04em] text-slate-700 uppercase">
                              ★ {shop.totalStars.toFixed(1)}
                              <span className="ml-1 font-normal text-slate-400">
                                ({shop.numberOfReviews})
                              </span>
                            </p>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Denied state - show map without location */}
          {!loading && locationDenied && (
            <div className="mt-8">
              <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <div ref={mapContainerRef} className="absolute inset-0" />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
