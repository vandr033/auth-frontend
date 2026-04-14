"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { searchMapboxPlaces, reverseGeocodeMapbox, type MapboxFeature } from "@/lib/mapbox/location";

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

async function loadMapboxGl(): Promise<MapboxGlLike> {
    const existing = getMapboxGl();
    if (existing) return existing;

    await new Promise<void>((resolve, reject) => {
        const existing = document.getElementById(MAPBOX_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Failed to load map")), { once: true });
            return;
        }
        const script = document.createElement("script");
        script.id = MAPBOX_SCRIPT_ID;
        script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.1/mapbox-gl.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load map"));
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
    if (!loaded) throw new Error("Mapbox global not found after load");
    return loaded;
}

interface DeliveryAddressPickerProps {
    value: string;
    onChange: (address: string) => void;
    error?: string;
    onErrorClear?: () => void;
}

export function DeliveryAddressPicker({ value, onChange, error, onErrorClear }: DeliveryAddressPickerProps) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";

    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<MapboxFeature[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [searching, setSearching] = useState(false);
    const [mapLoading, setMapLoading] = useState(false);
    const [pinLoading, setPinLoading] = useState(false);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapboxMapLike | null>(null);
    const markerRef = useRef<MapboxMarkerLike | null>(null);

    // Keep query in sync when value is externally cleared
    useEffect(() => {
        if (!value) setQuery("");
    }, [value]);

    const commitAddress = useCallback(
        (address: string) => {
            onChange(address);
            onErrorClear?.();
        },
        [onChange, onErrorClear],
    );

    const upsertMarker = useCallback((coords: [number, number], flyTo = true) => {
        const map = mapRef.current;
        const mapboxgl = getMapboxGl();
        if (!map || !mapboxgl) return;

        if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ draggable: true, color: "#e73886" })
                .setLngLat(coords)
                .addTo(map);

            markerRef.current.on("dragend", () => {
                void handlePinDragEnd();
            });
        } else {
            markerRef.current.setLngLat(coords);
        }

        if (flyTo) {
            map.flyTo({ center: coords, zoom: 16, essential: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePinDragEnd = useCallback(async () => {
        const marker = markerRef.current;
        if (!marker || !token) return;

        const lngLat = marker.getLngLat?.();
        if (!lngLat) return;

        setPinLoading(true);
        try {
            const result = await reverseGeocodeMapbox(Number(lngLat.lng), Number(lngLat.lat), token);
            if (result?.place_name) {
                setQuery(result.place_name);
                commitAddress(result.place_name);
            }
        } finally {
            setPinLoading(false);
        }
    }, [token, commitAddress]);

    // Load map once on mount
    useEffect(() => {
        if (!token || !mapContainerRef.current || mapRef.current) return;

        let disposed = false;
        setMapLoading(true);

        void loadMapboxGl()
            .then((mapboxgl) => {
                if (disposed || !mapContainerRef.current) return;

                mapboxgl.accessToken = token;

                const map = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: "mapbox://styles/mapbox/streets-v12",
                    center: FALLBACK_CENTER,
                    zoom: 11,
                });

                mapRef.current = map;
                map.doubleClickZoom.disable();

                map.on("dblclick", (event?: { lngLat?: MarkerLngLat }) => {
                    const lng = Number(event?.lngLat?.lng);
                    const lat = Number(event?.lngLat?.lat);
                    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
                    upsertMarker([lng, lat], false);
                    void (async () => {
                        if (!token) return;
                        setPinLoading(true);
                        try {
                            const result = await reverseGeocodeMapbox(lng, lat, token);
                            if (result?.place_name) {
                                setQuery(result.place_name);
                                commitAddress(result.place_name);
                            }
                        } finally {
                            setPinLoading(false);
                        }
                    })();
                });

                map.on("load", () => {
                    if (disposed) return;
                    setMapLoading(false);
                });

                map.on("error", () => {
                    if (disposed) return;
                    setMapLoading(false);
                });
            })
            .catch(() => {
                if (!disposed) setMapLoading(false);
            });

        return () => {
            disposed = true;
            markerRef.current?.remove?.();
            markerRef.current = null;
            mapRef.current?.remove?.();
            mapRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Debounced search
    useEffect(() => {
        if (!token || query.trim().length < 3) {
            setResults([]);
            setShowResults(false);
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setSearching(true);
            try {
                const found = await searchMapboxPlaces(query.trim(), token);
                if (!cancelled) {
                    setResults(found);
                    setShowResults(found.length > 0);
                }
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [token, query]);

    const handleSelect = (feature: MapboxFeature) => {
        const label = feature.place_name ?? feature.text ?? "";
        setQuery(label);
        commitAddress(label);
        setShowResults(false);
        setResults([]);

        if (feature.center?.length === 2) {
            upsertMarker(feature.center, true);
        }
    };

    const handleClear = () => {
        setQuery("");
        onChange("");
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className="grid gap-2">
            {/* Search input */}
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onErrorClear?.();
                    }}
                    placeholder="Search your address…"
                    className={`pl-9 pr-9${error ? " border-red-400 ring-1 ring-red-400" : ""}`}
                    autoComplete="off"
                />
                {searching && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
                )}
                {!searching && query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-main"
                        aria-label="Clear address"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Autocomplete results */}
            {showResults && results.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-md border border-surface-border bg-surface shadow-sm">
                    {results.map((r) => (
                        <button
                            key={r.id ?? `${r.place_name}-${r.center?.join(",")}`}
                            type="button"
                            className="flex w-full items-start gap-2 border-b border-surface-border px-3 py-2 text-left text-sm text-text-main hover:bg-page last:border-b-0"
                            onClick={() => handleSelect(r)}
                        >
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                            <span>{r.place_name ?? r.text}</span>
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Map */}
            <div className="relative overflow-hidden rounded-md border border-surface-border">
                <div ref={mapContainerRef} className="h-52 w-full" />
                {mapLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
                        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                    </div>
                )}
                {!token && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface/90 text-sm text-text-muted">
                        Map unavailable
                    </div>
                )}
                {pinLoading && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs text-text-muted shadow">
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" /> Looking up address…
                        </span>
                    </div>
                )}
            </div>
            <p className="text-xs text-text-muted">
                Search above, or drag the pin on the map to set your exact location.
            </p>
        </div>
    );
}
