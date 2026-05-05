"use client";

import * as React from "react";
import { Loader2, MapPin, Navigation, Search } from "lucide-react";

import { MapboxLocationPreview } from "@/components/maps/MapboxLocationPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  searchMapboxPlaces,
  type MapboxFeature,
} from "@/lib/mapbox/location";
import { getMapboxToken } from "@/lib/mapbox/loadMapboxGl";

export type DeliveryAddressValue = {
  deliveryAddress: string;
  deliveryNotes: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryPlaceId: string | null;
  deliveryLocationMeta: {
    provider?: string | null;
    source?: string | null;
    formattedAddress?: string | null;
    mapboxPlaceId?: string | null;
  } | null;
};

type DeliveryAddressSectionProps = {
  value: DeliveryAddressValue;
  disabled?: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onChange: (nextValue: DeliveryAddressValue) => void;
};

function buildLocationMeta(source: string, formattedAddress?: string | null, mapboxPlaceId?: string | null) {
  return {
    provider: "mapbox",
    source,
    formattedAddress: formattedAddress ?? null,
    mapboxPlaceId: mapboxPlaceId ?? null,
  };
}

export function DeliveryAddressSection({
  value,
  disabled = false,
  t,
  onChange,
}: DeliveryAddressSectionProps) {
  const mapboxToken = React.useMemo(() => getMapboxToken(), []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<MapboxFeature[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [showResults, setShowResults] = React.useState(false);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [geoFeedback, setGeoFeedback] = React.useState<string | null>(null);
  const hasMapbox = mapboxToken.length > 0;

  React.useEffect(() => {
    if (!hasMapbox) {
      setSearchResults([]);
      setShowResults(false);
      setSearchLoading(false);
      return;
    }

    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);

      void searchMapboxPlaces(query, mapboxToken)
        .then((results) => {
          if (cancelled) return;
          setSearchResults(results);
          setShowResults(true);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchResults([]);
          setShowResults(false);
          setSearchError(t("shopStore.locationSearchError"));
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hasMapbox, mapboxToken, searchQuery, t]);

  const updateValue = React.useCallback((patch: Partial<DeliveryAddressValue>) => {
    onChange({
      ...value,
      ...patch,
    });
  }, [onChange, value]);

  const handleSelectSearchResult = React.useCallback((feature: MapboxFeature) => {
    const parsed = parseMapboxFeature(feature);
    if (!parsed) return;

    const nextAddress = parsed.formattedAddress || parsed.address || feature.place_name || feature.text || value.deliveryAddress;

    onChange({
      ...value,
      deliveryAddress: nextAddress,
      deliveryLatitude: parsed.latitude,
      deliveryLongitude: parsed.longitude,
      deliveryPlaceId: parsed.mapboxPlaceId ?? null,
      deliveryLocationMeta: buildLocationMeta("search", parsed.formattedAddress, parsed.mapboxPlaceId),
      deliveryNotes: value.deliveryNotes,
    });
    setSearchQuery(nextAddress);
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
    setGeoFeedback(null);
  }, [onChange, value]);

  const handleUseCurrentLocation = React.useCallback(() => {
    if (disabled || typeof window === "undefined") return;

    if (!navigator.geolocation) {
      setGeoFeedback(t("shopStore.locationBrowserUnavailable"));
      return;
    }

    setGeoLoading(true);
    setGeoFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLongitude = Number(position.coords.longitude);
        const nextLatitude = Number(position.coords.latitude);

        if (!hasMapbox) {
          onChange({
            ...value,
            deliveryLatitude: nextLatitude,
            deliveryLongitude: nextLongitude,
            deliveryPlaceId: null,
            deliveryLocationMeta: {
              provider: "browser_geolocation",
              source: "geolocation",
            },
          });
          setGeoLoading(false);
          setGeoFeedback(t("shopStore.locationCapturedManualAddress"));
          return;
        }

        void reverseGeocodeMapbox(nextLongitude, nextLatitude, mapboxToken)
          .then((feature) => {
            if (!feature) {
              onChange({
                ...value,
                deliveryLatitude: nextLatitude,
                deliveryLongitude: nextLongitude,
                deliveryPlaceId: null,
                deliveryLocationMeta: {
                  provider: "browser_geolocation",
                  source: "geolocation",
                },
              });
              setGeoFeedback(t("shopStore.locationCapturedManualAddress"));
              return;
            }

            const parsed = parseMapboxFeature(feature);
            const nextAddress =
              parsed?.formattedAddress
              || parsed?.address
              || feature.place_name
              || value.deliveryAddress;

            onChange({
              ...value,
              deliveryAddress: nextAddress,
              deliveryLatitude: parsed?.latitude ?? nextLatitude,
              deliveryLongitude: parsed?.longitude ?? nextLongitude,
              deliveryPlaceId: parsed?.mapboxPlaceId ?? null,
              deliveryLocationMeta: buildLocationMeta("geolocation", parsed?.formattedAddress, parsed?.mapboxPlaceId),
            });
            setSearchQuery(nextAddress);
            setGeoFeedback(t("shopStore.locationCapturedSuccess"));
          })
          .catch(() => {
            onChange({
              ...value,
              deliveryLatitude: nextLatitude,
              deliveryLongitude: nextLongitude,
              deliveryPlaceId: null,
              deliveryLocationMeta: {
                provider: "browser_geolocation",
                source: "geolocation",
              },
            });
            setGeoFeedback(t("shopStore.locationCapturedManualAddress"));
          })
          .finally(() => {
            setGeoLoading(false);
          });
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoFeedback(t("shopStore.locationPermissionDenied"));
          return;
        }

        setGeoFeedback(t("shopStore.locationRequestFailed"));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, [disabled, hasMapbox, mapboxToken, onChange, t, value]);

  return (
    <div className="space-y-4 rounded-2xl border border-surface-border bg-page p-4">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 text-brand" />
        <div>
          <p className="text-sm font-semibold text-text-main">{t("shopStore.deliveryAddressSectionTitle")}</p>
          <p className="text-sm text-text-muted">{t("shopStore.deliveryAddressSectionHelp")}</p>
        </div>
      </div>

      {hasMapbox ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t("shopStore.searchAddress")}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
              placeholder={t("shopStore.searchAddressPlaceholder")}
              className="pl-9"
              disabled={disabled}
            />
          </div>

          {searchLoading ? (
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("shopStore.locationSearchLoading")}
            </p>
          ) : null}

          {searchError ? (
            <p className="text-sm text-amber-700">{searchError}</p>
          ) : null}

          {showResults && searchResults.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
              {searchResults.map((result) => (
                <button
                  key={result.id || `${result.place_name}-${result.center?.join(",")}`}
                  type="button"
                  className="block w-full border-b border-surface-border px-4 py-3 text-left text-sm text-text-main transition hover:bg-brand/5 last:border-b-0"
                  onClick={() => handleSelectSearchResult(result)}
                  disabled={disabled}
                >
                  {result.place_name || result.text}
                </button>
              ))}
            </div>
          ) : null}

          {!searchLoading && showResults && searchQuery.trim().length >= 3 && searchResults.length === 0 && !searchError ? (
            <p className="text-sm text-text-muted">{t("shopStore.locationSearchNoResults")}</p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("shopStore.locationMapUnavailableFallback")}
        </p>
      )}

      <div className="space-y-3 rounded-2xl border border-dashed border-surface-border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("shopStore.locationConsentTitle")}</p>
          <p className="text-sm text-text-muted">{t("shopStore.locationConsentHelp")}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={disabled || geoLoading}
        >
          {geoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
          {t("shopStore.useMyLocation")}
        </Button>

        {geoFeedback ? (
          <p className="text-sm text-text-muted">{geoFeedback}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("shopStore.deliveryAddress")}</label>
        <Input
          value={value.deliveryAddress}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            updateValue({
              deliveryAddress: event.target.value,
              deliveryLatitude: null,
              deliveryLongitude: null,
              deliveryPlaceId: null,
              deliveryLocationMeta: {
                provider: hasMapbox ? "mapbox" : "manual",
                source: "manual",
              },
            });
          }}
          placeholder={t("shopStore.deliveryAddressPlaceholder")}
          required
          disabled={disabled}
        />
        <p className="text-xs text-text-muted">{t("shopStore.deliveryCoordinatesOptional")}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("shopStore.deliveryNotes")}</label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-surface-border bg-page px-3 py-3"
          value={value.deliveryNotes}
          onChange={(event) => updateValue({ deliveryNotes: event.target.value })}
          placeholder={t("shopStore.deliveryNotesPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text-main">{t("shopStore.locationPreviewTitle")}</p>
        <MapboxLocationPreview
          query={value.deliveryAddress || searchQuery}
          defaultLatitude={value.deliveryLatitude}
          defaultLongitude={value.deliveryLongitude}
          className="h-64 overflow-hidden rounded-2xl border border-surface-border"
          fallbackText={t("shopStore.locationMapUnavailableFallback")}
        />
      </div>
    </div>
  );
}
