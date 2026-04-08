"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker, type LocationAutofillUpdate } from "@/components/admin/location/LocationPicker";
import { useT } from "@/lib/i18n";

type GroupLocationPickerProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
};

function toCoordinate(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toFixed(6);
}

export function GroupLocationPicker({
  label,
  value,
  onChange,
  placeholder,
  defaultLatitude,
  defaultLongitude,
}: GroupLocationPickerProps) {
  const t = useT();
  const [coordinates, setCoordinates] = useState<{ latitude: string; longitude: string }>({
    latitude: toCoordinate(defaultLatitude),
    longitude: toCoordinate(defaultLongitude),
  });
  const defaultsApplied = useRef(false);

  useEffect(() => {
    if (defaultsApplied.current) return;
    if (!defaultLatitude && !defaultLongitude) return;
    defaultsApplied.current = true;
    if (coordinates.latitude || coordinates.longitude) return;
    setCoordinates({
      latitude: toCoordinate(defaultLatitude),
      longitude: toCoordinate(defaultLongitude),
    });
  }, [coordinates.latitude, coordinates.longitude, defaultLatitude, defaultLongitude]);

  const handleAutofill = useCallback((update: LocationAutofillUpdate) => {
    const nextAddress = update.fields.address || update.formattedAddress || "";
    if (nextAddress.trim()) {
      onChange(nextAddress);
    }

    setCoordinates((prev) => ({
      latitude: update.fields.latitude ?? prev.latitude,
      longitude: update.fields.longitude ?? prev.longitude,
    }));
  }, [onChange]);

  const pickerText = useMemo(
    () => ({
      searchLabel: t("adminSettings.searchLocation"),
      searchPlaceholder: t("adminSettings.searchLocationPlaceholder"),
      helperText: t("adminSettings.searchLocationHelper"),
      searchLoadingText: t("adminSettings.locationSearchLoading"),
      searchErrorText: t("adminSettings.locationSearchError"),
      noResultsText: t("adminSettings.locationSearchNoResults"),
      reverseGeocodeLoadingText: t("adminSettings.reverseGeocodeLoading"),
      reverseGeocodeErrorText: t("adminSettings.reverseGeocodeError"),
      mapUnavailableText: t("adminSettings.mapUnavailable"),
      missingTokenText: t("adminSettings.mapTokenMissing"),
    }),
    [t],
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <LocationPicker
        value={{
          address: value,
          city: "",
          stateRegion: "",
          countryCode: "",
          timezone: "",
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }}
        text={pickerText}
        onLocationAutofill={handleAutofill}
      />
    </div>
  );
}
