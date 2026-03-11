"use client";

const MAPBOX_SCRIPT_ID = "mapbox-gl-script";
const MAPBOX_STYLE_ID = "mapbox-gl-style";
const getMapboxGlobal = () => (window as Window & { mapboxgl?: unknown }).mapboxgl;

export function getMapboxToken(explicitToken?: string): string {
  return (
    explicitToken?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    ""
  );
}

export async function loadMapboxGl(): Promise<unknown> {
  if (typeof window === "undefined") {
    throw new Error("Mapbox loader is client-only");
  }

  const existingGlobal = getMapboxGlobal();
  if (existingGlobal) {
    return existingGlobal;
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

  const loadedGlobal = getMapboxGlobal();
  if (!loadedGlobal) {
    throw new Error("Mapbox global not found");
  }

  return loadedGlobal;
}
