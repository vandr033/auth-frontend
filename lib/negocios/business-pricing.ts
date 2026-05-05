import { resolveApiUrl } from "@/lib/api-url";

export type PublicCoreProductKey = "RESERVAS" | "EVENTOS" | "CLASES" | "TIENDA";
export type SelectableCoreProductKey = PublicCoreProductKey;
export type BusinessPricingCoreTierKey =
  | "RESERVAS_BASE"
  | "RESERVAS_PRO"
  | "EVENTOS_BASE"
  | "EVENTOS_PRO"
  | "CLASES_BASE"
  | "CLASES_PRO"
  | "STORES_BASE"
  | "STORES_PRO";
export type PublicAddOnKey =
  | "PERSONALIZACION_PRO"
  | "METRICAS"
  | "MENSAJERIA_PRO"
  | "CRM_PRO";
export type BusinessPricingProductKey = PublicCoreProductKey | PublicAddOnKey;
export type PricingBillingCycle = "monthly" | "annual";
export type BusinessPricingProductType = "CORE" | "ADDON";

export type BusinessPricingTier = {
  tierKey: BusinessPricingCoreTierKey;
  label: "Base" | "Pro";
  monthlyPriceBs: number;
  featureList: string[];
  proUnlocks: string[];
  isDefault: boolean;
};

export type BusinessPricingProduct = {
  key: BusinessPricingProductKey;
  type: BusinessPricingProductType;
  displayName: string;
  description: string;
  monthlyPriceBs: number;
  isActive: boolean;
  isComingSoon: boolean;
  sortOrder: number;
  featureList: string[];
  includedNote?: string;
  tiers?: BusinessPricingTier[];
};

export type BusinessPricingBundleTier = {
  id?: number;
  minSelectedItems: number;
  discountPercent: number;
  label: string;
  sortOrder?: number;
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

export type CoreTierSelection = {
  productKey: SelectableCoreProductKey;
  tierKey: BusinessPricingCoreTierKey;
};

const RESERVAS_BASE_FEATURES = [
  "Reservas 1:1",
  "Servicios y categorías",
  "Personal / recursos",
  "Disponibilidad",
  "Página pública para reservar",
  "Confirmaciones básicas",
];

const EVENTOS_BASE_FEATURES = [
  "Eventos pagados",
  "Eventos gratuitos",
  "Registros",
  "Lista de interesados",
  "Formulario de inscripción",
];

const CLASES_BASE_FEATURES = [
  "Clases recurrentes",
  "Sesiones",
  "Inscripciones",
  "Asistencia básica",
  "Gestión de alumnos",
];

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
      featureList: [],
      tiers: [
        {
          tierKey: "RESERVAS_BASE",
          label: "Base",
          monthlyPriceBs: 300,
          featureList: RESERVAS_BASE_FEATURES,
          proUnlocks: [
            "Servicios con múltiples sesiones",
            "Flujos avanzados por servicio",
            "Operación avanzada de agenda",
          ],
          isDefault: true,
        },
        {
          tierKey: "RESERVAS_PRO",
          label: "Pro",
          monthlyPriceBs: 500,
          featureList: [
            "Todo lo de Reservas Base",
            "Servicios con múltiples sesiones",
            "Flujos avanzados por servicio",
            "Mejor manejo de recursos/personal",
            "Operación avanzada de agenda",
          ],
          proUnlocks: [],
          isDefault: false,
        },
      ],
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
      featureList: [],
      tiers: [
        {
          tierKey: "EVENTOS_BASE",
          label: "Base",
          monthlyPriceBs: 300,
          featureList: EVENTOS_BASE_FEATURES,
          proUnlocks: [
            "Control de asistencia avanzado",
            "Tickets / códigos si están disponibles",
            "Flujos avanzados de participantes",
          ],
          isDefault: true,
        },
        {
          tierKey: "EVENTOS_PRO",
          label: "Pro",
          monthlyPriceBs: 500,
          featureList: [
            "Todo lo de Eventos Base",
            "Control de asistencia avanzado",
            "Tickets / códigos si están disponibles",
            "Flujos avanzados de participantes",
            "Herramientas operativas para eventos",
          ],
          proUnlocks: [],
          isDefault: false,
        },
      ],
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
      featureList: [],
      tiers: [
        {
          tierKey: "CLASES_BASE",
          label: "Base",
          monthlyPriceBs: 300,
          featureList: CLASES_BASE_FEATURES,
          proUnlocks: [
            "Asistencia avanzada",
            "Cuotas / pagos si están disponibles",
            "Operación avanzada de clases",
          ],
          isDefault: true,
        },
        {
          tierKey: "CLASES_PRO",
          label: "Pro",
          monthlyPriceBs: 500,
          featureList: [
            "Todo lo de Clases Base",
            "Asistencia avanzada",
            "Cuotas / pagos si están disponibles",
            "Seguimiento de alumnos",
            "Operación avanzada de clases",
          ],
          proUnlocks: [],
          isDefault: false,
        },
      ],
    },
    {
      key: "TIENDA",
      type: "CORE",
      displayName: "Tienda",
      description: "Catálogo, pedidos, combos, stock y checkout QR para vender desde tu página.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 4,
      featureList: [],
      tiers: [
        {
          tierKey: "STORES_BASE",
          label: "Base",
          monthlyPriceBs: 300,
          featureList: [
            "Productos y categorías",
            "Stock global",
            "Combos estructurados",
            "Pickup y delivery",
            "Checkout invitado",
            "QR manual",
          ],
          proUnlocks: [
            "Pedidos programados",
            "Promociones",
            "Asignación interna",
            "Métricas de tienda",
          ],
          isDefault: true,
        },
        {
          tierKey: "STORES_PRO",
          label: "Pro",
          monthlyPriceBs: 500,
          featureList: [
            "Todo lo de Tienda Base",
            "Pedidos programados",
            "Promociones",
            "Asignación de pedidos",
            "Métricas de tienda",
          ],
          proUnlocks: [],
          isDefault: false,
        },
      ],
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
      featureList: [
        "CTA avanzado",
        "Layouts",
        "Footer",
        "Anuncios",
        "Orden de secciones",
        "Branding visual",
      ],
      includedNote: "Personalización Base incluida por defecto.",
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
      featureList: [
        "Reservas",
        "Ingresos",
        "Servicios top",
        "Personal top",
        "Clientes",
        "Reseñas",
        "Eventos y clases si están habilitados",
      ],
    },
    {
      key: "MENSAJERIA_PRO",
      type: "ADDON",
      displayName: "Mensajería / Recordatorios Pro",
      description: "Menos ausencias, más recompra y clientes mejor atendidos.",
      monthlyPriceBs: 300,
      isActive: true,
      isComingSoon: false,
      sortOrder: 12,
      featureList: [
        "Recordatorios",
        "Campañas",
        "Solicitudes de reseña",
        "WhatsApp y email outreach",
        "Comunicación masiva",
      ],
      includedNote: "Mensajería Base incluida por defecto.",
    },
    {
      key: "CRM_PRO",
      type: "ADDON",
      displayName: "CRM / Clientes Pro",
      description: "Tus clientes no deberían vivir perdidos en chats.",
      monthlyPriceBs: 250,
      isActive: true,
      isComingSoon: false,
      sortOrder: 13,
      featureList: [
        "Historial",
        "Segmentación",
        "Importación y exportación",
        "Reactivación",
        "Clientes por producto, evento o clase",
      ],
      includedNote: "CRM Base incluido por defecto.",
    },
  ],
  discounts: {
    bundleTiers: [
      { minSelectedItems: 1, discountPercent: 0, label: "1 producto", sortOrder: 1 },
      { minSelectedItems: 2, discountPercent: 10, label: "2 productos", sortOrder: 2 },
      { minSelectedItems: 3, discountPercent: 15, label: "3 productos", sortOrder: 3 },
      { minSelectedItems: 4, discountPercent: 20, label: "4+ productos", sortOrder: 4 },
    ],
    annualDiscountPercent: 15,
    trialLengthDays: 30,
    firstMonthFree: true,
  },
};

const KNOWN_CORE_PRODUCTS: SelectableCoreProductKey[] = ["RESERVAS", "EVENTOS", "CLASES", "TIENDA"];
const KNOWN_TIER_KEYS: BusinessPricingCoreTierKey[] = [
  "RESERVAS_BASE",
  "RESERVAS_PRO",
  "EVENTOS_BASE",
  "EVENTOS_PRO",
  "CLASES_BASE",
  "CLASES_PRO",
  "STORES_BASE",
  "STORES_PRO",
];

function isKnownProductKey(value: unknown): value is BusinessPricingProductKey {
  return typeof value === "string" && DEFAULT_BUSINESS_PRICING_CONFIG.products.some((product) => product.key === value);
}

function isKnownTierKey(value: unknown): value is BusinessPricingCoreTierKey {
  return typeof value === "string" && KNOWN_TIER_KEYS.includes(value as BusinessPricingCoreTierKey);
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

export function getDefaultTierForCoreProduct(productKey: SelectableCoreProductKey): BusinessPricingCoreTierKey {
  if (productKey === "RESERVAS") return "RESERVAS_BASE";
  if (productKey === "EVENTOS") return "EVENTOS_BASE";
  if (productKey === "CLASES") return "CLASES_BASE";
  return "STORES_BASE";
}

export function isTierValidForCoreProduct(
  productKey: SelectableCoreProductKey,
  tierKey: BusinessPricingCoreTierKey,
) {
  if (productKey === "RESERVAS") {
    return tierKey === "RESERVAS_BASE" || tierKey === "RESERVAS_PRO";
  }
  if (productKey === "EVENTOS") {
    return tierKey === "EVENTOS_BASE" || tierKey === "EVENTOS_PRO";
  }
  if (productKey === "CLASES") {
    return tierKey === "CLASES_BASE" || tierKey === "CLASES_PRO";
  }
  return tierKey === "STORES_BASE" || tierKey === "STORES_PRO";
}

export function buildBusinessPricingProductMap(config: BusinessPricingConfig) {
  return new Map(config.products.map((product) => [product.key, product]));
}

export function getTierByKey(
  product: BusinessPricingProduct | undefined,
  tierKey?: BusinessPricingCoreTierKey | null,
) {
  if (!product?.tiers?.length) return null;
  if (tierKey) {
    const exactTier = product.tiers.find((tier) => tier.tierKey === tierKey);
    if (exactTier) return exactTier;
  }
  return product.tiers.find((tier) => tier.isDefault) ?? product.tiers[0] ?? null;
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
      featureList: Array.isArray((entry as { featureList?: unknown[] }).featureList)
        ? ((entry as { featureList: unknown[] }).featureList.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          ))
        : fallback.featureList,
      includedNote: typeof (entry as { includedNote?: unknown }).includedNote === "string"
        ? (entry as { includedNote: string }).includedNote
        : fallback.includedNote,
      tiers: Array.isArray((entry as { tiers?: unknown[] }).tiers)
        ? ((entry as { tiers: unknown[] }).tiers
            .filter((tier): tier is Record<string, unknown> => Boolean(tier) && typeof tier === "object")
            .map((tier, index) => {
              const fallbackTier = fallback.tiers?.[index];
              const tierKey = isKnownTierKey(tier.tierKey) ? tier.tierKey : fallbackTier?.tierKey;
              if (!tierKey) return null;

              return {
                tierKey,
                label: tier.label === "Pro" ? "Pro" : fallbackTier?.label ?? "Base",
                monthlyPriceBs: toFiniteNumber(tier.monthlyPriceBs, fallbackTier?.monthlyPriceBs ?? fallback.monthlyPriceBs),
                featureList: Array.isArray(tier.featureList)
                  ? tier.featureList.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
                  : fallbackTier?.featureList ?? [],
                proUnlocks: Array.isArray(tier.proUnlocks)
                  ? tier.proUnlocks.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
                  : fallbackTier?.proUnlocks ?? [],
                isDefault: toBoolean(tier.isDefault, fallbackTier?.isDefault ?? index === 0),
              } satisfies BusinessPricingTier;
            })
            .filter((tier): tier is BusinessPricingTier => tier !== null))
        : fallback.tiers,
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
            sortOrder: Math.max(
              0,
              Math.round(toFiniteNumber(tier.sortOrder, fallback.sortOrder ?? index + 1)),
            ),
          };
        })
        .sort((left, right) => {
          const leftOrder = left.sortOrder ?? left.minSelectedItems;
          const rightOrder = right.sortOrder ?? right.minSelectedItems;
          if (leftOrder !== rightOrder) return leftOrder - rightOrder;
          return left.minSelectedItems - right.minSelectedItems;
        })
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

export function sanitizeCoreSelections(
  selections: CoreTierSelection[],
  pricingConfig: BusinessPricingConfig = DEFAULT_BUSINESS_PRICING_CONFIG,
) {
  const pricingByKey = buildBusinessPricingProductMap(pricingConfig);
  const deduped = new Map<SelectableCoreProductKey, CoreTierSelection>();

  selections.forEach((selection) => {
    const product = pricingByKey.get(selection.productKey);
    if (!product || product.type !== "CORE" || !product.isActive || product.isComingSoon) return;
    if (!isTierValidForCoreProduct(selection.productKey, selection.tierKey)) return;
    deduped.set(selection.productKey, selection);
  });

  return Array.from(deduped.values());
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

export function isSelectableCoreProductKey(value: string): value is SelectableCoreProductKey {
  return KNOWN_CORE_PRODUCTS.includes(value as SelectableCoreProductKey);
}
