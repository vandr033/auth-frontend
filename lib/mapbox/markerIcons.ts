/**
 * Generates category-based marker icons for Mapbox maps.
 *
 * Each marker is a small circle with a white icon/emoji inside,
 * colored by business category. Falls back to a generic pin icon.
 */

// Category → emoji mapping (covers common business types)
const CATEGORY_ICONS: Record<string, string> = {
  barbería: "✂️",
  barberia: "✂️",
  barber: "✂️",
  peluquería: "✂️",
  peluqueria: "✂️",
  "salón de belleza": "💇",
  "salon de belleza": "💇",
  salon: "💇",
  beauty: "💇",
  hair: "💇",
  spa: "🧖",
  wellness: "🧖",
  "uñas": "💅",
  unas: "💅",
  nails: "💅",
  manicura: "💅",
  "estética": "✨",
  estetica: "✨",
  facial: "✨",
  psicólogos: "🧠",
  psicologos: "🧠",
  fisioterapia: "💆",
  depilación: "🌟",
  depilacion: "🌟",
  maquillaje: "💄",
  makeup: "💄",
  tattoo: "🖋️",
  tatuaje: "🖋️",
  masaje: "💆",
  massage: "💆",
};

const CATEGORY_COLORS: Record<string, string> = {
  barbería: "#1a1a2e",
  barberia: "#1a1a2e",
  barber: "#1a1a2e",
  peluquería: "#1a1a2e",
  peluqueria: "#1a1a2e",
  "salón de belleza": "#e73886",
  "salon de belleza": "#e73886",
  salon: "#e73886",
  beauty: "#e73886",
  hair: "#e73886",
  spa: "#7c3aed",
  wellness: "#7c3aed",
  "uñas": "#ec4899",
  unas: "#ec4899",
  nails: "#ec4899",
  manicura: "#ec4899",
  "estética": "#f59e0b",
  estetica: "#f59e0b",
  facial: "#f59e0b",
  psicólogos: "#3b82f6",
  psicologos: "#3b82f6",
  fisioterapia: "#10b981",
  depilación: "#f97316",
  depilacion: "#f97316",
  maquillaje: "#ef4444",
  makeup: "#ef4444",
  tattoo: "#374151",
  tatuaje: "#374151",
  masaje: "#8b5cf6",
  massage: "#8b5cf6",
};

const DEFAULT_ICON = "📍";
const DEFAULT_COLOR = "#050505";

function lookupCategory(category: string | null | undefined): { icon: string; color: string } {
  if (!category) return { icon: DEFAULT_ICON, color: DEFAULT_COLOR };
  const key = category.toLowerCase().trim();
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return { icon, color: CATEGORY_COLORS[k] || DEFAULT_COLOR };
  }
  return { icon: DEFAULT_ICON, color: DEFAULT_COLOR };
}

/**
 * Render a marker icon to a canvas and return its ImageData.
 * Size is the pixel dimension of the square image.
 */
function renderMarkerToCanvas(
  icon: string,
  bgColor: string,
  size: number,
  opts?: { selected?: boolean; hovered?: boolean },
): ImageData | null {
  if (typeof document === "undefined") return null;

  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const canvas = document.createElement("canvas");
  const s = size * ratio;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = s / 2;
  const cy = s / 2;
  const r = s / 2 - 2 * ratio;

  // Selected halo
  if (opts?.selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250,255,54,0.55)";
    ctx.fill();
  }

  // White border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Colored inner circle
  const inner = r - 2 * ratio;
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Hover ring
  if (opts?.hovered) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#e73886";
    ctx.lineWidth = 2.5 * ratio;
    ctx.stroke();
  }

  // Icon/emoji
  const fontSize = Math.round(inner * 0.9);
  ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(icon, cx, cy + 1 * ratio);

  return ctx.getImageData(0, 0, s, s);
}

/**
 * Create an HTML marker element for a single company pin.
 * Used for unclustered points where we want logo or category icon.
 */
export function createMarkerElement(opts: {
  category?: string | null;
  logo?: string | null;
  size?: number;
  selected?: boolean;
  hovered?: boolean;
}): HTMLDivElement {
  const size = opts.size ?? 36;
  const { icon, color } = lookupCategory(opts.category);
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.border = "2.5px solid #fff";
  el.style.cursor = "pointer";
  el.style.overflow = "hidden";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.boxShadow = opts.selected
    ? "0 0 0 4px rgba(250,255,54,0.55), 0 2px 6px rgba(0,0,0,0.25)"
    : "0 2px 6px rgba(0,0,0,0.25)";
  el.style.transition = "transform 0.15s ease, box-shadow 0.15s ease";

  if (opts.hovered) {
    el.style.transform = "scale(1.15)";
    el.style.border = "2.5px solid #e73886";
  }

  if (opts.logo) {
    // Use company logo as marker
    el.style.backgroundColor = "#fff";
    const img = document.createElement("img");
    img.src = opts.logo;
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "50%";
    img.onerror = () => {
      // Fallback to category icon if image fails
      el.removeChild(img);
      el.style.backgroundColor = color;
      el.style.fontSize = `${Math.round(size * 0.48)}px`;
      el.textContent = icon;
    };
    el.appendChild(img);
  } else {
    // Use category icon
    el.style.backgroundColor = color;
    el.style.fontSize = `${Math.round(size * 0.48)}px`;
    el.textContent = icon;
  }

  return el;
}

/**
 * Render a category icon to ImageData for use with Mapbox's addImage.
 * Returns null if running server-side.
 */
export function renderCategoryIcon(
  category: string | null,
  size: number,
  opts?: { selected?: boolean; hovered?: boolean },
): ImageData | null {
  const { icon, color } = lookupCategory(category);
  return renderMarkerToCanvas(icon, color, size, opts);
}

export { lookupCategory };
