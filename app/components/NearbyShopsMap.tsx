"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";

import { useApi } from "@/app/hooks/useApi";
import { useT } from "@/lib/i18n";
import { getMapboxToken, loadMapboxGl } from "@/lib/mapbox/loadMapboxGl";
import { createMarkerElement } from "@/lib/mapbox/markerIcons";

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
  logo?: string | null;
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

interface MapboxMarkerLike {
  setLngLat: (coords: [number, number]) => MapboxMarkerLike;
  addTo: (map: MapboxMapLike) => MapboxMarkerLike;
  remove?: () => void;
}

interface MapboxPopupLike {
  setLngLat: (coords: [number, number]) => MapboxPopupLike;
  setHTML: (html: string) => MapboxPopupLike;
  addTo: (map: MapboxMapLike) => MapboxPopupLike;
  remove?: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Marker: new (options?: Record<string, unknown>) => MapboxMarkerLike;
  Popup: new (options?: Record<string, unknown>) => MapboxPopupLike;
  LngLatBounds: new (
    sw: [number, number],
    ne: [number, number],
  ) => { extend: (coords: [number, number]) => unknown };
}

const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];
const LOCATION_CACHE_KEY = "priconpri.nearby.location";
const LOCATION_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type CachedLocation = {
  lat: number;
  lng: number;
  updatedAt: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function hasCoordinates(
  value: NearbyShop | Partial<NearbyShop> | null | undefined,
): value is NearbyShop & { lat: number; lng: number } {
  if (!value) return false;
  return isValidLatLng(value.lat, value.lng);
}

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
  const mapToken = getMapboxToken();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const userMarkerRef = useRef<MapboxMarkerLike | null>(null);
  const popupRef = useRef<MapboxPopupLike | null>(null);
  const shopMarkersRef = useRef<MapboxMarkerLike[]>([]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const readCachedLocation = useCallback((): CachedLocation | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LOCATION_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CachedLocation>;
      if (!isValidLatLng(parsed?.lat, parsed?.lng) || !isFiniteNumber(parsed?.updatedAt)) {
        return null;
      }
      if (Date.now() - parsed.updatedAt > LOCATION_CACHE_TTL_MS) return null;
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        updatedAt: parsed.updatedAt,
      };
    } catch {
      return null;
    }
  }, []);

  const cacheLocation = useCallback((lat: number, lng: number) => {
    if (typeof window === "undefined") return;
    try {
      const payload: CachedLocation = { lat, lng, updatedAt: Date.now() };
      window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore local storage failures */
    }
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
        cacheLocation(position.coords.latitude, position.coords.longitude);
        setLocationDenied(false);
      },
      () => {
        setLocationDenied(true);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [cacheLocation]);

  // Bootstrap geolocation/cached location on mount
  useEffect(() => {
    const cached = readCachedLocation();
    if (cached) {
      setUserLocation({ lat: cached.lat, lng: cached.lng });
      setLocationRequested(true);
    }

    if (!navigator.geolocation) {
      if (!cached) setLocationDenied(true);
      return;
    }

    void navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          requestLocation();
        } else if (result.state === "denied" && !cached) {
          setLocationDenied(true);
        }
      })
      .catch(() => {
        /* some browsers do not fully support permissions API */
      });
  }, [readCachedLocation, requestLocation]);

  // Fetch nearby shops when location is available
  useEffect(() => {
    if (!userLocation) return;

    let cancelled = false;
    setLoading(true);

    void api
      .get<{ error?: boolean; data?: NearbyShop[] }>(`/home/search`)
      .then((response) => {
        if (cancelled) return;
        const payload = response.data as { data?: NearbyShop[] } | NearbyShop[];
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        const withCoords = rows.filter(hasCoordinates);

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
    let mapLoaded = false;

    void loadMapboxGl()
      .then((mapboxModule) => {
        if (disposed || !mapContainerRef.current) return;
        const mapboxgl = mapboxModule as MapboxGlLike;
        mapboxgl.accessToken = mapToken;

        const center: [number, number] = FALLBACK_CENTER;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom: 12,
          attributionControl: false,
          interactive: true,
        });

        mapRef.current = map;
        map.on("error", () => {
          if (!disposed && !mapLoaded) {
            setMapLoadFailed(true);
          }
        });

        map.on("load", () => {
          if (disposed) return;
          mapLoaded = true;
          setMapReady(true);
          setMapLoadFailed(false);
        });
      })
      .catch(() => {
        if (!disposed) {
          setMapLoadFailed(true);
        }
      });

    return () => {
      disposed = true;
      setMapReady(false);
      popupRef.current?.remove?.();
      popupRef.current = null;
      userMarkerRef.current?.remove?.();
      userMarkerRef.current = null;
      for (const m of shopMarkersRef.current) m.remove?.();
      shopMarkersRef.current = [];
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapToken]);

  // Keep map centered around user location and show a marker when available.
  useEffect(() => {
    if (!userLocation || !isValidLatLng(userLocation.lat, userLocation.lng) || !mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const mapboxgl = (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl;
    if (!mapboxgl) return;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "nearby-user-pulse";
      el.style.cssText =
        "width:16px;height:16px;background:#e73886;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(231,56,134,0.25);";
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
    map.easeTo({
      center: [userLocation.lng, userLocation.lat],
      duration: 400,
    });
  }, [mapReady, userLocation]);

  // Update map markers when shops change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const mapboxgl = (window as Window & { mapboxgl?: MapboxGlLike }).mapboxgl;
    if (!mapboxgl) return;

    // Remove old markers
    for (const m of shopMarkersRef.current) {
      m.remove?.();
    }
    shopMarkersRef.current = [];

    const withCoords = shops.filter(hasCoordinates);

    for (const shop of withCoords) {
      const el = createMarkerElement({
        category: shop.category,
        logo: shop.logo,
        size: 34,
      });

      // Click handler — show popup
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const safeName = escapeHtml(shop.name);
        const safeCategory = shop.category ? escapeHtml(shop.category) : "";
        const safeCity = shop.city ? escapeHtml(shop.city) : "";
        const safeServiceName = shop.serviceName ? escapeHtml(shop.serviceName) : "";
        const viewHref = shop.slug ? `/shop/${encodeURIComponent(shop.slug)}` : "#";
        const priceDisplay = (shop.servicePriceCents ?? 0) > 0
          ? `${(shop.servicePriceCents! / 100).toFixed(2)} Bs`
          : "";

        popupRef.current?.remove?.();
        popupRef.current = new mapboxgl.Popup({ offset: 18, closeButton: false })
          .setLngLat([shop.lng, shop.lat])
          .setHTML(
            `<div style="min-width:216px;max-width:240px;border:1px solid rgba(0,0,0,.24);background:#fff;padding:10px">
              <p style="margin:0;font-size:12px;line-height:1;letter-spacing:.12em;text-transform:uppercase;color:#e73886">${safeCategory}</p>
              <p style="margin:6px 0 0;font-weight:800;font-size:20px;line-height:.95;text-transform:uppercase;color:#050505">${safeName}</p>
              ${safeServiceName ? `<p style="margin:8px 0 0;font-size:12px;font-weight:700;line-height:1.15;color:#111;text-transform:uppercase">${safeServiceName}</p>` : ""}
              ${priceDisplay ? `<p style="margin:4px 0 0;font-size:11px;font-weight:700;line-height:1.15;color:#111;text-transform:uppercase">${escapeHtml(priceDisplay)}</p>` : ""}
              ${shop.totalStars ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;line-height:1.15;color:#333;text-transform:uppercase">★ ${shop.totalStars.toFixed(1)} (${shop.numberOfReviews})</p>` : ""}
              ${safeCity ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;line-height:1.15;color:#333;text-transform:uppercase">${safeCity}</p>` : ""}
              <div style="margin-top:10px;display:flex;gap:6px">
                <a href="${viewHref}" style="display:inline-flex;align-items:center;justify-content:center;height:30px;flex:1;background:#050505;color:#fff;text-decoration:none;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #111">${escapeHtml(t("homeRedesign.nearbyMap.viewShop"))}</a>
              </div>
            </div>`,
          )
          .addTo(map);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([shop.lng, shop.lat])
        .addTo(map);
      shopMarkersRef.current.push(marker);
    }

    // Fit bounds to include user + all shops
    if (withCoords.length > 0 && userLocation) {
      try {
        const bounds = new mapboxgl.LngLatBounds(
          [userLocation.lng, userLocation.lat],
          [userLocation.lng, userLocation.lat],
        );
        for (const s of withCoords) {
          bounds.extend([s.lng, s.lat]);
        }
        map.fitBounds(bounds as unknown as [[number, number], [number, number]], {
          padding: 60,
          duration: 400,
          maxZoom: 14,
        });
      } catch {
        /* bounds fit failed */
      }
    }
  }, [shops, mapReady, userLocation, t]);

  const shopsWithCoords = shops.filter(hasCoordinates);

  return (
    <section className="w-full bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8">
        <div>
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
          {loading && !userLocation && (
            <div className="mt-8 flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("homeRedesign.nearbyMap.loading")}
            </div>
          )}

          {/* Map + results */}
          <div className="mt-8">
            {userLocation && shopsWithCoords.length > 0 && (
              <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-slate-500 uppercase">
                {t("homeRedesign.nearbyMap.shopCount", { count: shopsWithCoords.length })}
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              {/* Map */}
              <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:min-h-[480px]">
                {!mapToken ? null : <div ref={mapContainerRef} className="h-full w-full" />}
                {(!mapToken || mapLoadFailed) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-100 p-6 text-center">
                    <p className="max-w-sm text-sm text-slate-600">
                      {t("marketplaceRedesign.map.failedToLoad")}
                    </p>
                  </div>
                )}
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/45 backdrop-blur-[1px]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("homeRedesign.nearbyMap.loading")}
                    </div>
                  </div>
                )}
              </div>

              {/* Side list */}
              <div className="max-h-[480px] space-y-2 overflow-y-auto">
                {!userLocation ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t("homeRedesign.nearbyMap.enableLocation")}
                  </p>
                ) : shopsWithCoords.length === 0 ? (
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
        </div>
      </div>
    </section>
  );
}
