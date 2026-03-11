"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getMapboxToken, loadMapboxGl } from "@/lib/mapbox/loadMapboxGl";
import type { MarketplaceBounds, MarketplaceMapPin } from "@/lib/marketplace/types";

interface MarketplaceMapProps {
  pins: MarketplaceMapPin[];
  selectedCompanyId: number | null;
  hoveredCompanyId: number | null;
  loading: boolean;
  searchInMapArea: boolean;
  searchAreaPending: boolean;
  appliedBounds: MarketplaceBounds | null;
  fitKey: number;
  onPinClick: (companyId: number) => void;
  onMapMoved: (bounds: MarketplaceBounds) => void;
  onSearchAreaClick: () => void;
  className?: string;
  showSearchAreaAction?: boolean;
}

type Feature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    companyId: number;
    name: string;
    slug: string;
    matchType: "exact" | "flexible" | "similar";
    selected: boolean;
    hovered: boolean;
    isPrimaryMatch: boolean;
    serviceName?: string;
    serviceId?: number;
    serviceTypeId?: number;
    matchedSlotDate?: string;
    rating?: number;
    reviewCount?: number;
    matchedSlotTime?: string;
    priceFrom?: number;
    city?: string;
  };
};

interface MapboxBoundsLike {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
}

interface MapboxGeoJsonSourceLike {
  setData?: (data: unknown) => void;
  getClusterExpansionZoom?: (
    clusterId: string | number,
    callback: (error: Error | null, zoom: number) => void,
  ) => void;
}

interface MapboxQueriedFeature {
  properties?: Record<string, unknown>;
  geometry: {
    coordinates: [number, number];
  };
}

interface MapboxLayerEvent {
  point: unknown;
  features?: MapboxQueriedFeature[];
}

interface MapboxLngLatBoundsLike {
  extend: (coordinates: [number, number]) => MapboxLngLatBoundsLike;
}

interface MapboxMapLike {
  on: {
    (event: "load" | "moveend" | "error", callback: () => void): void;
    (event: "click" | "mouseenter" | "mouseleave", layerId: string, callback: (event: MapboxLayerEvent) => void): void;
  };
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  queryRenderedFeatures: (point: unknown, options?: { layers?: string[] }) => MapboxQueriedFeature[];
  getSource: (id: string) => MapboxGeoJsonSourceLike | undefined;
  easeTo: (options: Record<string, unknown>) => void;
  fitBounds: (
    bounds: [[number, number], [number, number]] | MapboxLngLatBoundsLike,
    options?: Record<string, unknown>,
  ) => void;
  getCanvas: () => HTMLCanvasElement;
  getBounds: () => MapboxBoundsLike;
  getZoom: () => number;
  remove: () => void;
}

interface MapboxPopupLike {
  setLngLat: (coordinates: [number, number]) => MapboxPopupLike;
  setHTML: (html: string) => MapboxPopupLike;
  addTo: (map: MapboxMapLike) => MapboxPopupLike;
  remove: () => void;
}

interface MapboxGlLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => MapboxMapLike;
  Popup: new (options?: Record<string, unknown>) => MapboxPopupLike;
  LngLatBounds: new (southWest: [number, number], northEast: [number, number]) => MapboxLngLatBoundsLike;
}

const SOURCE_ID = "marketplace-results-source";
const CLUSTER_LAYER_ID = "marketplace-results-clusters";
const CLUSTER_COUNT_LAYER_ID = "marketplace-results-cluster-count";
const SELECTED_HALO_LAYER_ID = "marketplace-results-selected-halo";
const POINT_LAYER_ID = "marketplace-results-points";

const FALLBACK_CENTER: [number, number] = [-63.1821, -17.7833];
const FALLBACK_ZOOM = 11;

function toFeature(pin: MarketplaceMapPin, selectedCompanyId: number | null, hoveredCompanyId: number | null): Feature {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [pin.lng, pin.lat],
    },
    properties: {
      companyId: pin.companyId,
      name: pin.title,
      slug: pin.slug,
      matchType: pin.matchType,
      selected: selectedCompanyId === pin.companyId,
      hovered: hoveredCompanyId === pin.companyId,
      isPrimaryMatch: pin.isPrimaryMatch,
      serviceName: pin.popup?.serviceName,
      serviceId: pin.popup?.serviceId,
      serviceTypeId: pin.popup?.serviceTypeId,
      matchedSlotDate: pin.popup?.matchedSlotDate,
      rating: pin.popup?.rating,
      reviewCount: pin.popup?.reviewCount,
      matchedSlotTime: pin.popup?.matchedSlotTime,
      priceFrom: pin.popup?.priceFrom,
      city: pin.popup?.city || undefined,
    },
  };
}

function toBoundsLike(bounds: MapboxBoundsLike): MarketplaceBounds {
  return {
    minLng: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLng: bounds.getEast(),
    maxLat: bounds.getNorth(),
  };
}

function boundsAreClose(a: MarketplaceBounds, b: MarketplaceBounds, epsilon = 0.0004): boolean {
  return (
    Math.abs(a.minLng - b.minLng) < epsilon &&
    Math.abs(a.minLat - b.minLat) < epsilon &&
    Math.abs(a.maxLng - b.maxLng) < epsilon &&
    Math.abs(a.maxLat - b.maxLat) < epsilon
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function MarketplaceMap({
  pins,
  selectedCompanyId,
  hoveredCompanyId,
  loading,
  searchInMapArea,
  searchAreaPending,
  appliedBounds,
  fitKey,
  onPinClick,
  onMapMoved,
  onSearchAreaClick,
  className,
  showSearchAreaAction = true,
}: MarketplaceMapProps) {
  const t = useT();
  const mapToken = getMapboxToken();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapLike | null>(null);
  const popupRef = useRef<MapboxPopupLike | null>(null);
  const mapboxModuleRef = useRef<MapboxGlLike | null>(null);
  const onPinClickRef = useRef(onPinClick);
  const onMapMovedRef = useRef(onMapMoved);
  const geoJsonRef = useRef<{ type: "FeatureCollection"; features: Feature[] }>({
    type: "FeatureCollection",
    features: [],
  });
  const suppressMoveEndRef = useRef(false);

  const [mapLoading, setMapLoading] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const geoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: pins.map((pin) => toFeature(pin, selectedCompanyId, hoveredCompanyId)),
    }),
    [pins, selectedCompanyId, hoveredCompanyId],
  );

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    onMapMovedRef.current = onMapMoved;
  }, [onMapMoved]);

  useEffect(() => {
    geoJsonRef.current = geoJson;
  }, [geoJson]);

  useEffect(() => {
    if (!mapToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    let disposed = false;
    setMapLoading(true);

    void loadMapboxGl()
      .then((mapboxModule) => {
        if (disposed || !mapContainerRef.current) return;
        const mapboxgl = mapboxModule as MapboxGlLike;
        mapboxModuleRef.current = mapboxgl;

        mapboxgl.accessToken = mapToken;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: FALLBACK_CENTER,
          zoom: FALLBACK_ZOOM,
          attributionControl: true,
        });

        mapRef.current = map;

        map.on("load", () => {
          if (disposed) return;

          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: geoJsonRef.current,
            cluster: true,
            clusterRadius: 45,
            clusterMaxZoom: 14,
          });

          map.addLayer({
            id: CLUSTER_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#7c3aed",
                8,
                "#0ea5e9",
                20,
                "#111827",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                8,
                24,
                20,
                28,
              ],
              "circle-opacity": 0.85,
            },
          });

          map.addLayer({
            id: CLUSTER_COUNT_LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            },
            paint: {
              "text-color": "#ffffff",
            },
          });

          map.addLayer({
            id: SELECTED_HALO_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["boolean", ["get", "selected"], false],
            ],
            paint: {
              "circle-color": "#faff36",
              "circle-opacity": 0.55,
              "circle-radius": 18,
              "circle-blur": 0.18,
            },
          });

          map.addLayer({
            id: POINT_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "case",
                ["boolean", ["get", "selected"], false],
                "#050505",
                ["boolean", ["get", "hovered"], false],
                "#e73886",
                ["==", ["get", "matchType"], "exact"],
                "#050505",
                "#e73886",
              ],
              "circle-stroke-width": [
                "case",
                ["boolean", ["get", "selected"], false],
                4,
                ["boolean", ["get", "hovered"], false],
                2.5,
                1.5,
              ],
              "circle-stroke-color": "#ffffff",
              "circle-radius": [
                "case",
                ["boolean", ["get", "selected"], false],
                11,
                ["boolean", ["get", "hovered"], false],
                9,
                8,
              ],
            },
          });

          map.on("click", CLUSTER_LAYER_ID, (event: MapboxLayerEvent) => {
            const features = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] });
            const firstFeature = features[0];
            if (!firstFeature) return;
            const clusterId = firstFeature.properties?.cluster_id;
            if (typeof clusterId !== "number" && typeof clusterId !== "string") return;

            const source = map.getSource(SOURCE_ID);
            if (!source?.getClusterExpansionZoom) return;

            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              suppressMoveEndRef.current = true;
              map.easeTo({
                center: firstFeature.geometry.coordinates,
                zoom,
                duration: 350,
              });
              window.setTimeout(() => {
                suppressMoveEndRef.current = false;
              }, 420);
            });
          });

          map.on("click", POINT_LAYER_ID, (event: MapboxLayerEvent) => {
            const feature = event.features?.[0];
            if (!feature) return;

            const companyId = Number(feature.properties?.companyId);
            if (!Number.isFinite(companyId)) return;

            const name = String(feature.properties?.name || "Salon");
            const slug = String(feature.properties?.slug || "");
            const serviceName = String(feature.properties?.serviceName || t("marketplaceRedesign.map.popup.defaultService"));
            const serviceId = Number(feature.properties?.serviceId ?? 0);
            const serviceTypeId = Number(feature.properties?.serviceTypeId ?? 0);
            const matchedSlotDate = String(feature.properties?.matchedSlotDate || "");
            const matchedSlotTime = String(feature.properties?.matchedSlotTime || "");
            const priceFrom = Number(feature.properties?.priceFrom ?? 0);
            const rating = Number(feature.properties?.rating ?? 0);
            const reviewCount = Number(feature.properties?.reviewCount ?? 0);
            const city = String(feature.properties?.city || "");

            const safeName = escapeHtml(name);
            const safeServiceName = escapeHtml(serviceName);
            const safeCity = city ? escapeHtml(city) : "";
            const safeDateTime = matchedSlotDate && matchedSlotTime ? `${escapeHtml(matchedSlotDate)} · ${escapeHtml(matchedSlotTime)}` : "";

            const canBook = Boolean(slug && serviceId > 0 && matchedSlotDate && matchedSlotTime);
            const bookHref = canBook
              ? `/shop/${encodeURIComponent(slug)}/book?source=marketplace&surface=map_pin&serviceId=${serviceId}&service_ids=${serviceId}${
                  serviceTypeId > 0 ? `&serviceTypeId=${serviceTypeId}&service_type_id=${serviceTypeId}` : ""
                }&companyId=${companyId}&company_id=${companyId}&date=${encodeURIComponent(matchedSlotDate)}&time=${encodeURIComponent(
                  matchedSlotTime,
                )}&matchedSlotTime=${encodeURIComponent(matchedSlotTime)}`
              : "";
            const viewHref = slug ? `/shop/${encodeURIComponent(slug)}?source=marketplace&surface=map_pin` : "#";

            popupRef.current?.remove?.();
            popupRef.current = new mapboxgl.Popup({ offset: 14, closeButton: false })
              .setLngLat(feature.geometry.coordinates)
              .setHTML(
                `<div style="min-width:216px;max-width:240px;border:1px solid rgba(0,0,0,.24);background:#fff;padding:10px">
                  <p style="margin:0;font-family:inherit;font-size:12px;line-height:1;letter-spacing:.12em;text-transform:uppercase;color:#e73886">${escapeHtml(
                    t("marketplaceRedesign.map.popup.label"),
                  )}</p>
                  <p style="margin:6px 0 0;font-weight:800;font-size:20px;line-height:.95;text-transform:uppercase;color:#050505">${safeName}</p>
                  <p style="margin:8px 0 0;font-size:12px;font-weight:700;line-height:1.15;color:#111;text-transform:uppercase">${safeServiceName}</p>
                  ${
                    safeDateTime
                      ? `<p style="margin:7px 0 0;font-size:11px;font-weight:600;line-height:1.15;color:#333;text-transform:uppercase">${escapeHtml(
                          t("marketplaceRedesign.map.popup.nextSlot"),
                        )}: ${safeDateTime}</p>`
                      : ""
                  }
                  ${
                    priceFrom
                      ? `<p style="margin:4px 0 0;font-size:11px;font-weight:700;line-height:1.15;color:#111;text-transform:uppercase">${escapeHtml(
                          t("marketplaceRedesign.map.popup.fromPrice"),
                        )}: $${(priceFrom / 100).toFixed(2)}</p>`
                      : ""
                  }
                  ${
                    rating
                      ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;line-height:1.15;color:#333;text-transform:uppercase">${escapeHtml(
                          t("marketplaceRedesign.map.popup.rating"),
                        )}: ${rating.toFixed(1)} (${reviewCount})</p>`
                      : ""
                  }
                  ${
                    safeCity
                      ? `<p style="margin:4px 0 0;font-size:11px;font-weight:600;line-height:1.15;color:#333;text-transform:uppercase">${safeCity}</p>`
                      : ""
                  }
                  <div style="margin-top:10px;display:flex;gap:6px">
                    ${
                      canBook
                        ? `<a href="${bookHref}" style="display:inline-flex;align-items:center;justify-content:center;height:30px;flex:1;background:#faff36;color:#111;text-decoration:none;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #111">${escapeHtml(
                            t("marketplaceRedesign.map.popup.bookNow"),
                          )}</a>`
                        : ""
                    }
                    <a href="${viewHref}" style="display:inline-flex;align-items:center;justify-content:center;height:30px;${
                      canBook ? "width:92px;" : "flex:1;"
                    }background:#fff;color:#111;text-decoration:none;font-weight:800;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #111">${escapeHtml(
                      t("marketplaceRedesign.map.popup.viewSalon"),
                    )}</a>
                  </div>
                </div>`,
              )
              .addTo(map);

            onPinClickRef.current(companyId);
          });

          map.on("mouseenter", CLUSTER_LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", CLUSTER_LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("mouseenter", POINT_LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", POINT_LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });

          map.on("moveend", () => {
            if (suppressMoveEndRef.current) return;
            const bounds = toBoundsLike(map.getBounds());
            onMapMovedRef.current(bounds);
          });

          setMapLoading(false);
        });

        map.on("error", () => {
          if (disposed) return;
          setMapFailed(true);
          setMapLoading(false);
        });
      })
      .catch(() => {
        if (disposed) return;
        setMapFailed(true);
        setMapLoading(false);
      });

    return () => {
      disposed = true;
      popupRef.current?.remove?.();
      popupRef.current = null;
      mapRef.current?.remove?.();
      mapRef.current = null;
      mapboxModuleRef.current = null;
    };
  }, [mapToken, t]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxModuleRef.current;
    if (!map || !mapboxgl) return;

    const source = map.getSource(SOURCE_ID);
    if (source?.setData) {
      source.setData(geoJson);
    }
  }, [geoJson]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxModuleRef.current;
    if (!map || !mapboxgl) return;

    if (pins.length === 0) {
      suppressMoveEndRef.current = true;

      if (appliedBounds) {
        map.fitBounds(
          [
            [appliedBounds.minLng, appliedBounds.minLat],
            [appliedBounds.maxLng, appliedBounds.maxLat],
          ],
          {
            padding: 56,
            duration: 250,
            maxZoom: 14,
          },
        );
      } else {
        map.easeTo({ center: FALLBACK_CENTER, zoom: FALLBACK_ZOOM, duration: 250 });
      }

      window.setTimeout(() => {
        suppressMoveEndRef.current = false;
      }, 300);
      return;
    }

    suppressMoveEndRef.current = true;

    if (appliedBounds) {
      map.fitBounds(
        [
          [appliedBounds.minLng, appliedBounds.minLat],
          [appliedBounds.maxLng, appliedBounds.maxLat],
        ],
        {
          padding: 56,
          duration: 300,
          maxZoom: 14,
        },
      );
    } else {
      const fitBounds = pins.reduce(
        (acc, pin) => {
          acc.extend([pin.lng, pin.lat]);
          return acc;
        },
        new mapboxgl.LngLatBounds([pins[0].lng, pins[0].lat], [pins[0].lng, pins[0].lat]),
      );

      map.fitBounds(fitBounds, {
        padding: 56,
        duration: 300,
        maxZoom: 14,
      });
    }

    window.setTimeout(() => {
      suppressMoveEndRef.current = false;
    }, 380);
  }, [appliedBounds, fitKey, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCompanyId) return;

    const selectedPin = pins.find((pin) => pin.companyId === selectedCompanyId);
    if (!selectedPin) return;

    const currentBounds = toBoundsLike(map.getBounds());
    const selectedBounds: MarketplaceBounds = {
      minLng: selectedPin.lng,
      minLat: selectedPin.lat,
      maxLng: selectedPin.lng,
      maxLat: selectedPin.lat,
    };

    if (!boundsAreClose(currentBounds, selectedBounds, 0.08)) {
      suppressMoveEndRef.current = true;
      map.easeTo({ center: [selectedPin.lng, selectedPin.lat], duration: 260, zoom: Math.max(map.getZoom(), 13) });
      window.setTimeout(() => {
        suppressMoveEndRef.current = false;
      }, 320);
    }
  }, [pins, selectedCompanyId]);

  if (!mapToken) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <div>
          <MapPin className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">{t("marketplaceRedesign.map.unavailableTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t("marketplaceRedesign.map.unavailableDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (mapFailed) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        {t("marketplaceRedesign.map.failedToLoad")}
      </div>
    );
  }

  return (
    <div className={cn("relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100", className)}>
      <div ref={mapContainerRef} className="h-full w-full" />

      {(mapLoading || loading) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("marketplaceRedesign.map.loading")}
          </div>
        </div>
      )}

      {showSearchAreaAction && searchInMapArea && searchAreaPending && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
          <Button
            type="button"
            size="sm"
            className={cn("pointer-events-auto bg-slate-900 text-white hover:bg-slate-800")}
            onClick={onSearchAreaClick}
          >
            <LocateFixed className="mr-2 h-4 w-4" />
            {t("marketplaceRedesign.map.searchThisArea")}
          </Button>
        </div>
      )}
    </div>
  );
}
