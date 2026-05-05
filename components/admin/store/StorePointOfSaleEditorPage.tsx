"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";

import {
  createAdminCommercePointOfSale,
  listAdminCommercePointsOfSale,
  updateAdminCommercePointOfSale,
  type AdminCommercePointOfSale,
} from "@/app/admin/lib/adminCommerceApi";
import { ErrorBanner, LoadingSkeleton } from "@/components/admin/shared";
import { MapboxLocationPreview } from "@/components/maps/MapboxLocationPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import {
  parseMapboxFeature,
  reverseGeocodeMapbox,
  searchMapboxPlaces,
  type MapboxFeature,
} from "@/lib/mapbox/location";
import { notify } from "@/lib/notify";

type PointOfSaleFormState = {
  id: string | null;
  name: string;
  address: string;
  opening_time: string;
  closing_time: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  notes: string;
  is_active: boolean;
};

const EMPTY_FORM: PointOfSaleFormState = {
  id: null,
  name: "",
  address: "",
  opening_time: "09:00",
  closing_time: "18:00",
  latitude: "",
  longitude: "",
  google_maps_url: "",
  notes: "",
  is_active: true,
};

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function getFormFromPoint(point: AdminCommercePointOfSale): PointOfSaleFormState {
  return {
    id: point.id,
    name: point.name,
    address: point.address,
    opening_time: point.opening_time,
    closing_time: point.closing_time,
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    google_maps_url: point.google_maps_url,
    notes: point.notes ?? "",
    is_active: point.is_active ?? true,
  };
}

type StorePointOfSaleEditorPageProps = {
  pointId?: string;
};

export function StorePointOfSaleEditorPage({ pointId }: StorePointOfSaleEditorPageProps) {
  const t = useT();
  const mapboxToken =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    "";

  const isEditing = Boolean(pointId);
  const [loading, setLoading] = React.useState(isEditing);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [queryLoading, setQueryLoading] = React.useState(false);
  const [queryResults, setQueryResults] = React.useState<MapboxFeature[]>([]);
  const [points, setPoints] = React.useState<AdminCommercePointOfSale[]>([]);
  const [form, setForm] = React.useState<PointOfSaleFormState>(EMPTY_FORM);

  React.useEffect(() => {
    if (!isEditing || !pointId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const allPoints = await listAdminCommercePointsOfSale();
        if (cancelled) return;
        setPoints(allPoints);
        const point = allPoints.find((entry) => entry.id === pointId);
        if (!point) {
          setError(t("adminStore.pointsOfSale.notFound"));
          return;
        }
        setForm(getFormFromPoint(point));
        setQuery(point.address);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t("adminStore.pointsOfSale.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isEditing, pointId, t]);

  React.useEffect(() => {
    if (!isEditing) return;
  }, [isEditing]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !mapboxToken) {
      setQueryResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQueryLoading(true);
      void searchMapboxPlaces(trimmed, mapboxToken)
        .then((results) => {
          if (!cancelled) setQueryResults(results);
        })
        .catch(() => {
          if (!cancelled) setQueryResults([]);
        })
        .finally(() => {
          if (!cancelled) setQueryLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapboxToken, query]);

  const handleFeatureSelect = React.useCallback((feature: MapboxFeature) => {
    const parsed = parseMapboxFeature(feature);
    if (!parsed) {
      notify.error(t("adminStore.pointsOfSale.locationInvalid"));
      return;
    }

    setForm((current) => ({
      ...current,
      address: parsed.formattedAddress || parsed.address || current.address,
      latitude: String(parsed.latitude),
      longitude: String(parsed.longitude),
      google_maps_url: buildGoogleMapsUrl(parsed.latitude, parsed.longitude),
    }));
    setQuery(feature.place_name || parsed.formattedAddress || parsed.address || "");
    setQueryResults([]);
  }, [t]);

  const handleMapDoubleClick = React.useCallback(
    async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      setForm((current) => ({
        ...current,
        latitude: String(latitude),
        longitude: String(longitude),
        google_maps_url: buildGoogleMapsUrl(latitude, longitude),
      }));
      setQueryResults([]);

      if (!mapboxToken) return;

      try {
        const result = await reverseGeocodeMapbox(longitude, latitude, mapboxToken);
        const parsed = result ? parseMapboxFeature(result) : null;
        const nextAddress =
          result?.place_name || parsed?.formattedAddress || parsed?.address || "";

        if (!nextAddress) return;

        setForm((current) => ({
          ...current,
          address: nextAddress,
          latitude: String(latitude),
          longitude: String(longitude),
          google_maps_url: buildGoogleMapsUrl(latitude, longitude),
        }));
        setQuery(nextAddress);
      } catch {
        // Keep the selected coordinates even when reverse geocoding fails.
      }
    },
    [mapboxToken],
  );

  const handleSubmit = async () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.name.trim() || !form.address.trim()) {
      notify.warning(t("adminStore.pointsOfSale.required"));
      return;
    }

    if (!form.opening_time || !form.closing_time) {
      notify.warning(t("adminStore.pointsOfSale.hoursRequired"));
      return;
    }

    if (form.closing_time <= form.opening_time) {
      notify.warning(t("adminStore.pointsOfSale.hoursInvalid"));
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      notify.warning(t("adminStore.pointsOfSale.coordinatesRequired"));
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      opening_time: form.opening_time,
      closing_time: form.closing_time,
      latitude,
      longitude,
      google_maps_url: form.google_maps_url || buildGoogleMapsUrl(latitude, longitude),
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      sort_order: form.id
        ? points.find((point) => point.id === form.id)?.sort_order ?? points.length
        : points.length,
    };

    try {
      setSaving(true);
      if (form.id) {
        await updateAdminCommercePointOfSale(form.id, payload);
        notify.success(t("adminStore.pointsOfSale.updated"));
      } else {
        await createAdminCommercePointOfSale(payload);
        notify.success(t("adminStore.pointsOfSale.created"));
      }
      window.location.href = "/admin/dashboard/store/points-of-sale";
    } catch (nextError) {
      notify.error(nextError instanceof Error ? nextError.message : t("adminStore.pointsOfSale.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="cards" rows={3} />;
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner description={error} /> : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              {isEditing ? t("adminStore.pointsOfSale.editTitle") : t("adminStore.pointsOfSale.createTitle")}
            </CardTitle>
          </div>
          <Link href="/admin/dashboard/store/points-of-sale">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("adminStore.pointsOfSale.backToList")}
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("adminStore.pointsOfSale.nameLabel")}</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={t("adminStore.pointsOfSale.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("adminStore.pointsOfSale.searchLabel")}</Label>
            <div className="relative">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("adminStore.pointsOfSale.searchPlaceholder")}
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            {queryLoading ? (
              <p className="text-xs text-slate-500">{t("adminStore.pointsOfSale.searchLoading")}</p>
            ) : null}
            {queryResults.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {queryResults.map((result) => (
                  <button
                    key={result.id || result.place_name}
                    type="button"
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => handleFeatureSelect(result)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>{result.place_name || result.text}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t("adminStore.pointsOfSale.addressLabel")}</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder={t("adminStore.pointsOfSale.addressPlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("adminStore.pointsOfSale.openingTimeLabel")}</Label>
              <Input
                type="time"
                value={form.opening_time}
                onChange={(event) => setForm((current) => ({ ...current, opening_time: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("adminStore.pointsOfSale.closingTimeLabel")}</Label>
              <Input
                type="time"
                value={form.closing_time}
                onChange={(event) => setForm((current) => ({ ...current, closing_time: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("adminStore.pointsOfSale.latitudeLabel")}</Label>
              <Input
                value={form.latitude}
                onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                placeholder="-17.7833"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("adminStore.pointsOfSale.longitudeLabel")}</Label>
              <Input
                value={form.longitude}
                onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                placeholder="-63.1821"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("adminStore.pointsOfSale.googleMapsLabel")}</Label>
            <Input value={form.google_maps_url} readOnly />
          </div>

          <div className="space-y-2">
            <Label>{t("adminStore.pointsOfSale.notesLabel")}</Label>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-3 text-sm"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={t("adminStore.pointsOfSale.notesPlaceholder")}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <div>
              <Label>{t("adminStore.pointsOfSale.activeLabel")}</Label>
              <p className="text-sm text-slate-500">{t("adminStore.pointsOfSale.activeHint")}</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
            />
          </div>

          <MapboxLocationPreview
            defaultLatitude={form.latitude ? Number(form.latitude) : null}
            defaultLongitude={form.longitude ? Number(form.longitude) : null}
            query={form.address}
            className="h-56 w-full rounded-xl"
            fallbackText={t("adminStore.pointsOfSale.mapUnavailable")}
            onMapDoubleClick={(coordinates) => {
              void handleMapDoubleClick(coordinates);
            }}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-admin-brand text-white hover:bg-admin-brand/90"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? t("adminStore.pointsOfSale.saveAction") : t("adminStore.pointsOfSale.createAction")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
