import {
  buildBusinessPricingProductMap,
  DEFAULT_BUSINESS_PRICING_CONFIG,
  type BusinessPricingConfig,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/business-pricing";

export type PricingSelection = {
  coreProducts: SelectableCoreProductKey[];
  addOns: PublicAddOnKey[];
  billingCycle: PricingBillingCycle;
};

export type PricingBreakdown = {
  subtotalMonthly: number;
  selectedItemCount: number;
  bundleDiscountPercent: number;
  bundleDiscountAmount: number;
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
    coreProducts: Array.from(new Set(selection.coreProducts)).filter((key) => {
      const product = pricingByKey.get(key);
      return Boolean(product && product.type === "CORE" && product.isActive && !product.isComingSoon);
    }),
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
  const coreProducts = sanitizedSelection.coreProducts;
  const addOns = sanitizedSelection.addOns;
  const validationErrors: string[] = [];

  if (coreProducts.length === 0) {
    validationErrors.push("Elegí al menos un producto principal.");
  }

  const selectedProductKeys = [...coreProducts, ...addOns];
  const selectedItemCount = selectedProductKeys.length;
  const subtotalMonthly = selectedProductKeys.reduce((sum, key) => {
    const product = pricingByKey.get(key as PublicCoreProductKey | PublicAddOnKey);
    return sum + (product?.monthlyPriceBs ?? 0);
  }, 0);

  const bundleDiscountPercent = clampPercent(
    pricingConfig.discounts.bundleTiers
      .slice()
      .sort((left, right) => left.minSelectedItems - right.minSelectedItems)
      .reduce((currentDiscount, tier) => {
        if (selectedItemCount >= tier.minSelectedItems) {
          return tier.discountPercent;
        }
        return currentDiscount;
      }, 0),
  );

  const bundleDiscountAmount = roundMoney(subtotalMonthly * (bundleDiscountPercent / 100));
  const afterBundle = subtotalMonthly - bundleDiscountAmount;
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
    annualDiscountPercent,
    annualDiscountAmount,
    finalMonthly,
    finalAnnualEquivalent,
    firstMonthFree: pricingConfig.discounts.firstMonthFree,
    trialLengthDays: pricingConfig.discounts.trialLengthDays,
    selectedProductKeys,
    selectedProducts: selectedProductKeys.map(
      (key) => pricingByKey.get(key as PublicCoreProductKey | PublicAddOnKey)?.displayName ?? key,
    ),
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
