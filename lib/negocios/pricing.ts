import {
  ADD_ONS,
  CORE_PRODUCTS,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/catalog";

export type PricingSelection = {
  coreProducts: SelectableCoreProductKey[];
  addOns: PublicAddOnKey[];
  billingCycle: PricingBillingCycle;
};

export type PricingBreakdown = {
  subtotalMonthly: number;
  bundleDiscountPercent: number;
  bundleDiscountAmount: number;
  annualDiscountPercent: number;
  annualDiscountAmount: number;
  finalMonthly: number;
  finalAnnualEquivalent: number;
  selectedProducts: string[];
  validationErrors: string[];
};

const CORE_PRICE_BY_KEY = Object.fromEntries(
  CORE_PRODUCTS.map((product) => [product.key, product.priceMonthly]),
) as Record<SelectableCoreProductKey | PublicCoreProductKey, number>;

const ADD_ON_PRICE_BY_KEY = Object.fromEntries(
  ADD_ONS.map((product) => [product.key, product.priceMonthly]),
) as Record<PublicAddOnKey, number>;

const LABEL_BY_KEY = Object.fromEntries(
  [...CORE_PRODUCTS, ...ADD_ONS].map((product) => [product.key, product.title]),
) as Record<SelectableCoreProductKey | PublicCoreProductKey | PublicAddOnKey, string>;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateBusinessPricing(selection: PricingSelection): PricingBreakdown {
  const coreProducts = Array.from(new Set(selection.coreProducts));
  const addOns = Array.from(new Set(selection.addOns));
  const validationErrors: string[] = [];

  if (coreProducts.length === 0) {
    validationErrors.push("Elegí al menos un producto principal.");
  }

  const subtotalMonthly =
    coreProducts.reduce((sum, key) => sum + (CORE_PRICE_BY_KEY[key] ?? 0), 0) +
    addOns.reduce((sum, key) => sum + (ADD_ON_PRICE_BY_KEY[key] ?? 0), 0);

  let bundleDiscountPercent = 0;

  if (coreProducts.length === 2) {
    bundleDiscountPercent = 10;
  }

  if (coreProducts.length >= 3) {
    bundleDiscountPercent = 15;
  }

  if (coreProducts.length === 1 && addOns.length >= 2) {
    bundleDiscountPercent = Math.max(bundleDiscountPercent, addOns.length >= 3 ? 15 : 10);
  }

  const bundleDiscountAmount = roundMoney(subtotalMonthly * (bundleDiscountPercent / 100));
  const afterBundle = subtotalMonthly - bundleDiscountAmount;
  const annualDiscountPercent = selection.billingCycle === "annual" ? 15 : 0;
  const annualDiscountAmount = roundMoney(afterBundle * (annualDiscountPercent / 100));
  const finalMonthly = roundMoney(afterBundle - annualDiscountAmount);
  const finalAnnualEquivalent =
    selection.billingCycle === "annual"
      ? roundMoney(finalMonthly * 12)
      : roundMoney(afterBundle * 12 * 0.85);

  return {
    subtotalMonthly: roundMoney(subtotalMonthly),
    bundleDiscountPercent,
    bundleDiscountAmount,
    annualDiscountPercent,
    annualDiscountAmount,
    finalMonthly,
    finalAnnualEquivalent,
    selectedProducts: [...coreProducts, ...addOns].map((key) => LABEL_BY_KEY[key]),
    validationErrors,
  };
}

export function formatBsAmount(value: number) {
  return `${value.toFixed(2)} Bs`;
}
