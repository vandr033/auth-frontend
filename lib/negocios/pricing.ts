import {
  buildBusinessPricingProductMap,
  DEFAULT_BUSINESS_PRICING_CONFIG,
  getTierByKey,
  isSelectableCoreProductKey,
  isTierValidForCoreProduct,
  sanitizeCoreSelections,
  type BusinessPricingConfig,
  type CoreTierSelection,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/business-pricing";

export type PricingSelection = {
  coreSelections: CoreTierSelection[];
  addOns: PublicAddOnKey[];
  billingCycle: PricingBillingCycle;
};

export type PricingBreakdown = {
  subtotalMonthly: number;
  selectedItemCount: number;
  bundleDiscountPercent: number;
  bundleDiscountAmount: number;
  finalMonthlyBeforeAnnual: number;
  annualDiscountPercent: number;
  annualDiscountAmount: number;
  finalMonthly: number;
  finalAnnualEquivalent: number;
  firstMonthFree: boolean;
  trialLengthDays: number;
  selectedProductKeys: string[];
  selectedProducts: string[];
  validationErrors: string[];
};

const PUBLIC_ADD_ON_KEYS: PublicAddOnKey[] = [
  "PERSONALIZACION_PRO",
  "METRICAS",
  "MENSAJERIA_PRO",
  "CRM_PRO",
];

export function serializePricingSelection(selection: PricingSelection) {
  return encodeURIComponent(
    JSON.stringify({
      coreSelections: selection.coreSelections,
      addOns: Array.from(new Set(selection.addOns)),
      billingCycle: selection.billingCycle,
    }),
  );
}

export function parsePricingSelection(
  value: string | string[] | undefined,
): PricingSelection | null {
  const serialized = Array.isArray(value) ? value[0] : value;
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(serialized)) as {
      coreSelections?: unknown;
      addOns?: unknown;
      billingCycle?: unknown;
    };

    if (!parsed || typeof parsed !== "object") return null;

    const coreSelections = Array.isArray(parsed.coreSelections)
      ? parsed.coreSelections.filter(
          (selection): selection is CoreTierSelection =>
            Boolean(selection) &&
            typeof selection === "object" &&
            isSelectableCoreProductKey(
              (selection as { productKey?: unknown }).productKey as string,
            ) &&
            typeof (selection as { tierKey?: unknown }).tierKey === "string" &&
            isTierValidForCoreProduct(
              (selection as { productKey: SelectableCoreProductKey }).productKey,
              (selection as { tierKey: CoreTierSelection["tierKey"] }).tierKey,
            ),
        )
      : [];
    const addOns = Array.isArray(parsed.addOns)
      ? Array.from(
          new Set(
            parsed.addOns.filter(
              (key): key is PublicAddOnKey =>
                typeof key === "string" && PUBLIC_ADD_ON_KEYS.includes(key as PublicAddOnKey),
            ),
          ),
        )
      : [];

    if (coreSelections.length === 0) return null;

    return {
      coreSelections,
      addOns,
      billingCycle: parsed.billingCycle === "annual" ? "annual" : "monthly",
    };
  } catch {
    return null;
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function sanitizePricingSelection(
  selection: PricingSelection,
  pricingConfig: BusinessPricingConfig = DEFAULT_BUSINESS_PRICING_CONFIG,
): PricingSelection {
  const pricingByKey = buildBusinessPricingProductMap(pricingConfig);

  return {
    ...selection,
    coreSelections: sanitizeCoreSelections(selection.coreSelections, pricingConfig),
    addOns: Array.from(new Set(selection.addOns)).filter((key) => {
      const product = pricingByKey.get(key);
      return Boolean(product && product.type === "ADDON" && product.isActive && !product.isComingSoon);
    }),
  };
}

export function calculateBusinessPricing(
  selection: PricingSelection,
  pricingConfig: BusinessPricingConfig = DEFAULT_BUSINESS_PRICING_CONFIG,
): PricingBreakdown {
  const pricingByKey = buildBusinessPricingProductMap(pricingConfig);
  const sanitizedSelection = sanitizePricingSelection(selection, pricingConfig);
  const coreSelections = sanitizedSelection.coreSelections;
  const addOns = sanitizedSelection.addOns;
  const validationErrors: string[] = [];

  if (coreSelections.length === 0) {
    validationErrors.push("Seleccioná al menos un producto principal.");
  }

  const selectedProductKeys = [
    ...coreSelections.map((selectionItem) => `${selectionItem.productKey}:${selectionItem.tierKey}`),
    ...addOns,
  ];
  const selectedItemCount = coreSelections.length + addOns.length;
  const subtotalMonthly = [
    ...coreSelections.map((selectionItem) => {
      const product = pricingByKey.get(selectionItem.productKey as PublicCoreProductKey | PublicAddOnKey);
      return getTierByKey(product, selectionItem.tierKey)?.monthlyPriceBs ?? product?.monthlyPriceBs ?? 0;
    }),
    ...addOns.map((key) => pricingByKey.get(key)?.monthlyPriceBs ?? 0),
  ].reduce((sum, value) => sum + value, 0);

  const bundleDiscountPercent = clampPercent(
    pricingConfig.discounts.bundleTiers
      .slice()
      .sort((left, right) => {
        const leftOrder = left.sortOrder ?? left.minSelectedItems;
        const rightOrder = right.sortOrder ?? right.minSelectedItems;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.minSelectedItems - right.minSelectedItems;
      })
      .reduce((currentDiscount, tier) => {
        if (selectedItemCount >= tier.minSelectedItems) {
          return tier.discountPercent;
        }
        return currentDiscount;
      }, 0),
  );

  const bundleDiscountAmount = roundMoney(subtotalMonthly * (bundleDiscountPercent / 100));
  const afterBundle = subtotalMonthly - bundleDiscountAmount;
  const finalMonthlyBeforeAnnual = roundMoney(afterBundle);
  const annualDiscountPercent =
    selection.billingCycle === "annual"
      ? clampPercent(pricingConfig.discounts.annualDiscountPercent)
      : 0;
  const annualDiscountAmount = roundMoney(afterBundle * (annualDiscountPercent / 100));
  const finalMonthly = roundMoney(afterBundle - annualDiscountAmount);
  const finalAnnualEquivalent =
    selection.billingCycle === "annual"
      ? roundMoney(finalMonthly * 12)
      : roundMoney(
          afterBundle *
            12 *
            (1 - clampPercent(pricingConfig.discounts.annualDiscountPercent) / 100),
        );

  return {
    subtotalMonthly: roundMoney(subtotalMonthly),
    selectedItemCount,
    bundleDiscountPercent,
    bundleDiscountAmount,
    finalMonthlyBeforeAnnual,
    annualDiscountPercent,
    annualDiscountAmount,
    finalMonthly,
    finalAnnualEquivalent,
    firstMonthFree: pricingConfig.discounts.firstMonthFree,
    trialLengthDays: pricingConfig.discounts.trialLengthDays,
    selectedProductKeys,
    selectedProducts: [
      ...coreSelections.map((selectionItem) => {
        const product = pricingByKey.get(selectionItem.productKey);
        const tier = getTierByKey(product, selectionItem.tierKey);
        return `${product?.displayName ?? selectionItem.productKey} ${tier?.label ?? ""}`.trim();
      }),
      ...addOns.map(
        (key) => pricingByKey.get(key as PublicCoreProductKey | PublicAddOnKey)?.displayName ?? key,
      ),
    ],
    validationErrors,
  };
}

export function formatBsAmount(value: number) {
  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} Bs`;
}

export function formatBsCompact(value: number) {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  return `${new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value)} Bs`;
}
