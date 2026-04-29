import { resolveApiUrl } from "@/lib/api-url";

export type PublicCoreProductKey = "RESERVAS" | "EVENTOS" | "CLASES" | "TIENDA";
export type SelectableCoreProductKey = Exclude<PublicCoreProductKey, "TIENDA">;
export type PublicAddOnKey =
  | "PERSONALIZACION_PRO"
  | "METRICAS"
  | "MENSAJERIA_PRO"
  | "CRM_PRO";
export type BusinessPricingProductKey = PublicCoreProductKey | PublicAddOnKey;
export type PricingBillingCycle = "monthly" | "annual";
export type BusinessPricingProductType = "CORE" | "ADDON";

export type BusinessPricingProduct = {
  key: BusinessPricingProductKey;
  type: BusinessPricingProductType;
  displayName: string;
  description: string;
  monthlyPriceBs: number;
  isActive: boolean;
  isComingSoon: boolean;
  sortOrder: number;
};

export type BusinessPricingBundleTier = {
  minSelectedItems: number;
  discountPercent: number;
  label: string;
};

export type BusinessPricingConfig = {
  products: BusinessPricingProduct[];
  discounts: {
    bundleTiers: BusinessPricingBundleTier[];
    annualDiscountPercent: number;
    trialLengthDays: number;
    firstMonthFree: boolean;
  };
};

export const DEFAULT_BUSINESS_PRICING_CONFIG: BusinessPricingConfig = {
  products: [
    {
      key: "RESERVAS",
      type: "CORE",
      displayName: "Reservas",
      description: "Para negocios que viven de citas, servicios y horarios.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 1,
    },
    {
      key: "EVENTOS",
      type: "CORE",
      displayName: "Eventos",
      description: "Para vender entradas, registrar asistentes y manejar eventos sin planillas eternas.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 2,
    },
    {
      key: "CLASES",
      type: "CORE",
      displayName: "Clases",
      description: "Para operar clases recurrentes, sesiones, alumnos y asistencia.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 3,
    },
    {
      key: "TIENDA",
      type: "CORE",
      displayName: "Tienda",
      description: "Tu tienda online en Priconpri está en camino.",
      monthlyPriceBs: 300,
      isActive: false,
      isComingSoon: true,
      sortOrder: 4,
    },
    {
      key: "PERSONALIZACION_PRO",
      type: "ADDON",
      displayName: "Personalización Pro",
      description: "Una página que no parece plantilla.",
      monthlyPriceBs: 400,
      isActive: true,
      isComingSoon: false,
      sortOrder: 10,
    },
    {
      key: "METRICAS",
      type: "ADDON",
      displayName: "Métricas",
      description: "Tomá decisiones con números, no con intuición.",
      monthlyPriceBs: 250,
      isActive: true,
      isComingSoon: false,
      sortOrder: 11,
    },
    {
      key: "MENSAJERIA_PRO",
      type: "ADDON",
      displayName: "Mensajería Pro",
      description: "Menos ausencias, más recompra y clientes mejor atendidos.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 12,
    },
    {
      key: "CRM_PRO",
      type: "ADDON",
      displayName: "CRM Pro",
      description: "Tus clientes no deberían vivir perdidos en chats.",
      monthlyPriceBs: 250,
      isActive: true,
      isComingSoon: false,
      sortOrder: 13,
    },
  ],
  discounts: {
    bundleTiers: [
      { minSelectedItems: 1, discountPercent: 0, label: "1 producto" },
      { minSelectedItems: 2, discountPercent: 10, label: "2 productos" },
      { minSelectedItems: 3, discountPercent: 15, label: "3 productos" },
      { minSelectedItems: 4, discountPercent: 20, label: "4+ productos" },
    ],
    annualDiscountPercent: 15,
    trialLengthDays: 30,
    firstMonthFree: true,
  },
};

function isKnownProductKey(value: unknown): value is BusinessPricingProductKey {
  return typeof value === "string" && DEFAULT_BUSINESS_PRICING_CONFIG.products.some((product) => product.key === value);
}

function toFiniteNumber(value: unknown, fallback: number) {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toStringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function buildBusinessPricingProductMap(config: BusinessPricingConfig) {
  return new Map(config.products.map((product) => [product.key, product]));
}

export function resolveBusinessPricingConfig(payload: unknown): BusinessPricingConfig {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_BUSINESS_PRICING_CONFIG;
  }

  const payloadProducts = Array.isArray((payload as { products?: unknown[] }).products)
    ? (payload as { products: unknown[] }).products
    : [];
  const payloadDiscounts = (payload as { discounts?: Record<string, unknown> }).discounts ?? {};
  const defaultProductMap = buildBusinessPricingProductMap(DEFAULT_BUSINESS_PRICING_CONFIG);

  const productOverrides = new Map<BusinessPricingProductKey, Partial<BusinessPricingProduct>>();
  payloadProducts.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const key = (entry as { key?: unknown }).key;
    if (!isKnownProductKey(key)) return;

    const fallback = defaultProductMap.get(key);
    if (!fallback) return;

    productOverrides.set(key, {
      key,
      type:
        (entry as { type?: unknown }).type === "ADDON" || (entry as { type?: unknown }).type === "CORE"
          ? ((entry as { type: BusinessPricingProductType }).type)
          : fallback.type,
      displayName: toStringValue((entry as { displayName?: unknown }).displayName, fallback.displayName),
      description: toStringValue((entry as { description?: unknown }).description, fallback.description),
      monthlyPriceBs: toFiniteNumber((entry as { monthlyPriceBs?: unknown }).monthlyPriceBs, fallback.monthlyPriceBs),
      isActive: toBoolean((entry as { isActive?: unknown }).isActive, fallback.isActive),
      isComingSoon: toBoolean((entry as { isComingSoon?: unknown }).isComingSoon, fallback.isComingSoon),
      sortOrder: toFiniteNumber((entry as { sortOrder?: unknown }).sortOrder, fallback.sortOrder),
    });
  });

  const products = DEFAULT_BUSINESS_PRICING_CONFIG.products
    .map((product) => ({
      ...product,
      ...productOverrides.get(product.key),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const bundleTiers = Array.isArray(payloadDiscounts.bundleTiers)
    ? payloadDiscounts.bundleTiers
        .filter((tier): tier is Record<string, unknown> => Boolean(tier) && typeof tier === "object")
        .map((tier, index) => {
          const fallback =
            DEFAULT_BUSINESS_PRICING_CONFIG.discounts.bundleTiers[index] ??
            DEFAULT_BUSINESS_PRICING_CONFIG.discounts.bundleTiers.at(-1)!;

          return {
            minSelectedItems: Math.max(
              1,
              Math.round(toFiniteNumber(tier.minSelectedItems, fallback.minSelectedItems)),
            ),
            discountPercent: Math.max(
              0,
              Math.min(100, toFiniteNumber(tier.discountPercent, fallback.discountPercent)),
            ),
            label: toStringValue(tier.label, fallback.label),
          };
        })
        .sort((left, right) => left.minSelectedItems - right.minSelectedItems)
    : DEFAULT_BUSINESS_PRICING_CONFIG.discounts.bundleTiers;

  return {
    products,
    discounts: {
      bundleTiers: bundleTiers.length > 0 ? bundleTiers : DEFAULT_BUSINESS_PRICING_CONFIG.discounts.bundleTiers,
      annualDiscountPercent: Math.max(
        0,
        Math.min(
          100,
          toFiniteNumber(
            payloadDiscounts.annualDiscountPercent,
            DEFAULT_BUSINESS_PRICING_CONFIG.discounts.annualDiscountPercent,
          ),
        ),
      ),
      trialLengthDays: Math.max(
        0,
        Math.round(
          toFiniteNumber(
            payloadDiscounts.trialLengthDays,
            DEFAULT_BUSINESS_PRICING_CONFIG.discounts.trialLengthDays,
          ),
        ),
      ),
      firstMonthFree: toBoolean(
        payloadDiscounts.firstMonthFree,
        DEFAULT_BUSINESS_PRICING_CONFIG.discounts.firstMonthFree,
      ),
    },
  };
}

export async function fetchPublicBusinessPricingConfig(signal?: AbortSignal) {
  const response = await fetch(resolveApiUrl("/api/public/business-pricing"), {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  return resolveBusinessPricingConfig(payload);
}
