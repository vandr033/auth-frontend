"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  UtensilsCrossed,
  Dumbbell,
  MessageCircle,
  Sparkles,
  Store,
  SwatchBook,
  Ticket,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  getDefaultTierForCoreProduct,
  getTierByKey,
  type BusinessPricingConfig,
  type BusinessPricingCoreTierKey,
  type BusinessPricingProduct,
  type CoreTierSelection,
  type PricingBillingCycle,
  type PublicAddOnKey,
  type PublicCoreProductKey,
  type SelectableCoreProductKey,
} from "@/lib/negocios/business-pricing";
import {
  calculateBusinessPricing,
  formatBsAmount,
  formatBsCompact,
} from "@/lib/negocios/pricing";

type PricingSelectionState = {
  coreSelections: CoreTierSelection[];
  addOns: PublicAddOnKey[];
  billingCycle: PricingBillingCycle;
};

type BusinessPricingBuilderProps = {
  value: PricingSelectionState;
  onChange: (nextValue: PricingSelectionState) => void;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
  compact?: boolean;
  pricingConfig?: BusinessPricingConfig | null;
  isPricingLoading?: boolean;
  pricingError?: string | null;
  onRetryPricing?: () => void;
  onComplete?: () => void;
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const PRODUCT_ICONS: Record<
  PublicCoreProductKey | PublicAddOnKey,
  ComponentType<{ className?: string }>
> = {
  RESERVAS: CalendarDays,
  EVENTOS: Ticket,
  CLASES: Dumbbell,
  TIENDA: Store,
  RESTAURANTE: UtensilsCrossed,
  PERSONALIZACION_PRO: SwatchBook,
  METRICAS: BarChart3,
  MENSAJERIA_PRO: MessageCircle,
  CRM_PRO: Users,
};

const PRODUCT_COPY_KEYS: Partial<Record<BusinessPricingProduct["key"], string>> = {
  RESERVAS: "reservations",
  EVENTOS: "events",
  CLASES: "classes",
  TIENDA: "store",
  PERSONALIZACION_PRO: "customizationPro",
  METRICAS: "metrics",
  MENSAJERIA_PRO: "messagingPro",
  CRM_PRO: "crmPro",
};

function getProductCopy(t: Translate, product: BusinessPricingProduct) {
  const copyKey = PRODUCT_COPY_KEYS[product.key];
  if (!copyKey) return { name: product.displayName, description: product.description };

  return {
    name: t(`businessLanding.products.${copyKey}.name`),
    description: t(`businessLanding.products.${copyKey}.description`),
  };
}

function getLocalizedFeatures(
  t: Translate,
  product: BusinessPricingProduct,
  group: "baseFeatures" | "proFeatures",
  features: string[],
) {
  const copyKey = PRODUCT_COPY_KEYS[product.key];
  if (!copyKey) return features;

  return features.map((feature, index) => {
    const localized = t(`businessLanding.products.${copyKey}.${group}.${index}`);
    return localized.startsWith("businessLanding.") ? feature : localized;
  });
}

const STEPS = [
  { number: "01", key: "products" },
  { number: "02", key: "tiers" },
  { number: "03", key: "extras" },
  { number: "04", key: "billing" },
  { number: "05", key: "summary" },
] as const;

function SectionIntro({
  titleId,
  eyebrow,
  title,
  description,
}: {
  titleId: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
        {eyebrow}
      </p>
      <h3 id={titleId} className="mt-2 max-w-[22ch] font-heading text-balance text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-biz-heading-dark">
        {title}
      </h3>
      <p className="mt-4 max-w-[58ch] text-base leading-7 text-slate-700">
        {description}
      </p>
    </div>
  );
}

function PricingState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const t = useT();

  return (
    <div id="productos" className="overflow-hidden border border-black/10 bg-white">
      <div className="border-b border-black/10 bg-[#f7f4ef] px-5 py-7 sm:px-7 sm:py-9">
        <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">
          {t("businessLanding.pricing.state.eyebrow")}
        </p>
        <h2 className="mt-2 max-w-[22ch] font-heading text-balance text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-biz-heading-dark">
          {isLoading ? t("businessLanding.pricing.state.loadingTitle") : t("businessLanding.pricing.state.errorTitle")}
        </h2>
        <p className="mt-4 max-w-[54ch] text-base leading-7 text-slate-700">
          {isLoading
            ? t("businessLanding.pricing.state.loadingDescription")
            : error ?? t("businessLanding.pricing.state.errorDescription")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 px-5 py-7 sm:grid-cols-2 sm:px-7 sm:py-9" role="status" aria-busy="true" aria-label={t("businessLanding.pricing.state.loadingAria")}>
          {["product", "price"].map((key) => (
            <div key={key} className="border border-black/10 p-5">
              <span className="sr-only">{t("businessLanding.pricing.state.eyebrow")}</span>
              <div className="h-4 w-24 animate-pulse bg-slate-200" />
              <div className="mt-5 h-8 w-2/3 animate-pulse bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse bg-slate-100" />
              <div className="mt-2 h-4 w-4/5 animate-pulse bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div role="alert" className="flex flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-9">
          <p className="text-sm leading-6 text-slate-700">{t("businessLanding.pricing.state.blocked")}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center border border-black bg-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-barbie-pink">
              {t("businessLanding.pricing.state.retry")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PricingEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-7 border border-dashed border-black/20 bg-slate-50 px-5 py-6" role="status">
      <p className="font-heading text-lg font-semibold text-black">{title}</p>
      <p className="mt-2 max-w-[52ch] text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ProductChoice({
  product,
  selected,
  onToggle,
}: {
  product: BusinessPricingProduct;
  selected: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const productCopy = getProductCopy(t, product);
  const isDisabled = !product.isActive || product.isComingSoon;
  const baseTier = product.tiers?.find((tier) => tier.label === "Base");

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col border p-4 transition-colors sm:p-6",
        selected ? "border-black bg-black text-white" : "border-black/15 bg-white text-black",
        isDisabled && "border-black/10 bg-slate-100 text-slate-500",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center border",
            selected ? "border-white/20 bg-white/10 text-white" : "border-black/10 bg-black/[0.03] text-black",
            isDisabled && "border-black/10 bg-black/[0.03] text-slate-400",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "text-[11px] font-black uppercase tracking-[0.08em]",
            selected ? "text-biz-yellow" : "text-biz-barbie-pink",
          )}
        >
            {selected ? t("businessLanding.pricing.product.selected") : t("businessLanding.pricing.product.core")}
        </span>
      </div>

      <h4 className="mt-4 font-heading text-balance text-[clamp(1.35rem,2.4vw,1.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] sm:mt-6">
        {productCopy.name}
      </h4>
      <p className={cn("mt-2 max-w-[38ch] text-base leading-6 sm:mt-3", selected ? "text-white/75" : "text-slate-700", isDisabled && "text-slate-500")}>
        {productCopy.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-4 pt-4 sm:pt-6">
        <div>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.08em]", selected ? "text-white/55" : "text-slate-500")}>
            {t("businessLanding.pricing.product.from")}
          </p>
          <p className={cn("mt-1 font-bebas text-[2rem] uppercase leading-none tracking-[0.04em]", selected ? "text-biz-yellow" : "text-biz-barbie-pink", isDisabled && "text-slate-400")}>
            {formatBsCompact(baseTier?.monthlyPriceBs ?? product.monthlyPriceBs)}
          </p>
        </div>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onToggle}
          aria-pressed={selected}
          className={cn(
            "inline-flex min-h-12 items-center justify-center border px-4 text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
            selected ? "border-biz-yellow bg-biz-yellow text-black hover:bg-[#edf222]" : "border-black text-black hover:bg-black hover:text-white",
            isDisabled && "cursor-not-allowed border-black/10 bg-black/[0.03] text-slate-400",
          )}
        >
          {isDisabled ? t("businessLanding.pricing.product.comingSoon") : selected ? t("businessLanding.pricing.product.remove") : t("businessLanding.pricing.product.choose")}
        </button>
      </div>

      <Link
        href={`/negocios/${product.key.toLowerCase().replace("_", "-")}`}
        className={cn(
          "mt-3 inline-flex min-h-11 items-center text-[11px] font-black uppercase tracking-[0.08em] underline decoration-1 underline-offset-4 sm:mt-5",
          selected ? "text-white/70 hover:text-biz-yellow" : "text-slate-600 hover:text-black",
          isDisabled && "text-slate-400",
        )}
      >
        {t("businessLanding.pricing.product.viewIncludes")}
      </Link>
    </article>
  );
}

function TierChoice({
  product,
  selection,
  onChoose,
}: {
  product: BusinessPricingProduct;
  selection: CoreTierSelection;
  onChoose: (tierKey: BusinessPricingCoreTierKey) => void;
}) {
  const t = useT();
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const productCopy = getProductCopy(t, product);
  const activeTier = getTierByKey(product, selection.tierKey);
  const tiers = product.tiers ?? [];
  const proFeatures = activeTier?.proUnlocks ?? [];
  const activeFeatures = activeTier?.label === "Pro"
    ? (proFeatures.length > 0
        ? proFeatures
        : (activeTier.featureList ?? []).filter((feature) => !feature.toLowerCase().startsWith("todo lo de")).slice(0, 4))
    : (activeTier?.featureList ?? product.featureList).slice(0, 4);
  const localizedFeatures = getLocalizedFeatures(
    t,
    product,
    activeTier?.label === "Pro" ? "proFeatures" : "baseFeatures",
    activeFeatures,
  );

  return (
    <article className="border border-black/15 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-black/10 bg-black/[0.03] text-black">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h4 className="font-heading text-balance text-[clamp(1.35rem,2.4vw,1.8rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            {productCopy.name}
          </h4>
          <p className="mt-1 text-sm text-slate-600">{t("businessLanding.pricing.tier.chooseDescription")}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const isActive = activeTier?.tierKey === tier.tierKey;
          return (
            <button
              key={tier.tierKey}
              type="button"
              onClick={() => onChoose(tier.tierKey)}
              aria-pressed={isActive}
              className={cn(
                "min-h-36 border p-4 text-left transition-colors",
                isActive ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:border-black hover:bg-biz-yellow/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("text-[12px] font-black uppercase tracking-[0.08em]", isActive ? "text-biz-yellow" : "text-biz-barbie-pink")}>
                  {tier.label === "Base" ? t("businessLanding.pricing.tier.base") : t("businessLanding.pricing.tier.pro")}
                </span>
                {isActive ? <Check className="h-4 w-4 text-biz-yellow" /> : null}
              </div>
              <p className={cn("mt-3 font-bebas text-[1.9rem] leading-none", isActive ? "text-white" : "text-black")}>
                {formatBsCompact(tier.monthlyPriceBs)} <span className="font-sans text-[11px] font-bold uppercase tracking-[0.06em]">{t("businessLanding.pricing.tier.monthly")}</span>
              </p>
              <p className={cn("mt-3 text-xs leading-5", isActive ? "text-white/70" : "text-slate-600")}>
                {tier.label === "Base" ? t("businessLanding.pricing.tier.baseDescription") : t("businessLanding.pricing.tier.proDescription")}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-black/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          {activeTier?.label === "Pro" ? t("businessLanding.pricing.tier.proAdds") : t("businessLanding.pricing.tier.baseIncludes")}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {localizedFeatures.map((feature) => (
            <li key={`${product.key}-${feature}`} className="flex items-start gap-2 text-sm leading-5 text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-biz-barbie-pink" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function AddOnRow({
  product,
  selected,
  disabled,
  onToggle,
}: {
  product: BusinessPricingProduct;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const Icon = PRODUCT_ICONS[product.key] ?? Sparkles;
  const productCopy = getProductCopy(t, product);

  return (
    <div className={cn("flex flex-col gap-4 border-b border-black/10 py-5 sm:flex-row sm:items-center sm:justify-between", disabled && "opacity-55")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-black/10 bg-black/[0.03] text-black">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="font-heading text-[1.2rem] font-semibold leading-tight tracking-[-0.02em] text-black">
              {productCopy.name}
            </h4>
            {product.includedNote ? <span className="text-[10px] font-black uppercase tracking-[0.08em] text-biz-sky-surge">{t("businessLanding.pricing.tier.includedInPro")}</span> : null}
          </div>
          <p className="mt-2 max-w-[48ch] text-base leading-6 text-slate-700">{productCopy.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
        <p className="font-bebas text-[1.8rem] leading-none tracking-[0.04em] text-biz-barbie-pink">
          {formatBsCompact(product.monthlyPriceBs)} <span className="font-sans text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">{t("businessLanding.pricing.tier.monthly")}</span>
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-pressed={selected}
          className={cn(
            "inline-flex min-h-11 min-w-24 items-center justify-center border px-4 text-[11px] font-black uppercase tracking-[0.08em] transition-colors",
            selected ? "border-black bg-black text-white hover:bg-biz-barbie-pink hover:border-biz-barbie-pink" : "border-black bg-white text-black hover:bg-biz-yellow",
            disabled && "cursor-not-allowed border-black/10 bg-black/[0.03] text-slate-400",
          )}
        >
          {selected ? t("businessLanding.pricing.product.selected") : t("businessLanding.pricing.product.choose")}
        </button>
      </div>
    </div>
  );
}

function BillingChoice({
  active,
  title,
  description,
  price,
  detail,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  price: string;
  detail: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative min-h-44 border p-5 text-left transition-colors sm:p-6",
        active ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:border-black hover:bg-biz-yellow/20",
      )}
    >
      {badge ? <span className="absolute right-4 top-4 bg-biz-yellow px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black">{badge}</span> : null}
      <span className={cn("block max-w-[24ch] pr-16 text-[12px] font-black uppercase leading-[1.15] tracking-[0.08em]", active ? "text-biz-yellow" : "text-biz-barbie-pink")}>
        {title}
      </span>
      <p className={cn("mt-4 max-w-[18ch] font-business-display text-[2rem] uppercase leading-[0.9] tracking-[-0.03em]", active ? "text-white" : "text-black")}>
        {price}
      </p>
      <p className={cn("mt-3 max-w-[32ch] text-sm leading-5", active ? "text-white/70" : "text-slate-700")}>{description}</p>
      <p className={cn("mt-4 text-[11px] font-black uppercase tracking-[0.06em]", active ? "text-white/55" : "text-slate-500")}>{detail}</p>
    </button>
  );
}

export function BusinessPricingBuilder({
  value,
  onChange,
  ctaHref = "/negocios/crear-cuenta",
  ctaLabel,
  className,
  compact = false,
  pricingConfig,
  isPricingLoading = false,
  pricingError,
  onRetryPricing,
  onComplete,
}: BusinessPricingBuilderProps) {
  const t = useT();
  const resolvedCtaLabel = ctaLabel ?? t("businessLanding.pricing.actions.createAccount");
  const [activeStep, setActiveStep] = useState(1);
  if (!pricingConfig) {
    return <PricingState isLoading={isPricingLoading} error={pricingError} onRetry={onRetryPricing} />;
  }

  const coreProducts = pricingConfig.products.filter((product) => product.type === "CORE");
  const addOnProducts = pricingConfig.products.filter((product) => product.type === "ADDON");
  const pricing = calculateBusinessPricing(value, pricingConfig);
  const hasCoreProducts = value.coreSelections.length > 0;
  const productByKey = new Map(pricingConfig.products.map((product) => [product.key, product]));
  const localizedSelectedProducts = pricing.selectedProductKeys.map((selectedKey, index) => {
    const [productKey, tierKey] = selectedKey.split(":");
    const product = productByKey.get(productKey as BusinessPricingProduct["key"]);
    if (!product) return pricing.selectedProducts[index] ?? selectedKey;

    const productCopy = getProductCopy(t, product);
    if (!tierKey) return productCopy.name;

    const tierLabel = tierKey.endsWith("_PRO")
      ? t("businessLanding.pricing.tier.pro")
      : t("businessLanding.pricing.tier.base");
    return `${productCopy.name} ${tierLabel}`;
  });

  const setCoreSelection = (selection: CoreTierSelection) => {
    const selectionIndex = value.coreSelections.findIndex((item) => item.productKey === selection.productKey);
    const nextSelections = [...value.coreSelections];

    if (selectionIndex === -1) {
      nextSelections.push(selection);
    } else {
      nextSelections[selectionIndex] = selection;
    }

    onChange({ ...value, coreSelections: nextSelections });
  };

  const toggleCoreProduct = (product: BusinessPricingProduct) => {
    const productKey = product.key as SelectableCoreProductKey;
    const isSelected = value.coreSelections.some((item) => item.productKey === productKey);
    if (isSelected) {
      const nextCoreSelections = value.coreSelections.filter((item) => item.productKey !== productKey);
      onChange({ ...value, coreSelections: nextCoreSelections, addOns: nextCoreSelections.length === 0 ? [] : value.addOns });
      return;
    }

    onChange({
      ...value,
      coreSelections: [...value.coreSelections, { productKey, tierKey: getDefaultTierForCoreProduct(productKey) }],
    });
  };

  const toggleAddOn = (key: PublicAddOnKey) => {
    if (!hasCoreProducts) return;
    const exists = value.addOns.includes(key);
    onChange({ ...value, addOns: exists ? value.addOns.filter((item) => item !== key) : [...value.addOns, key] });
  };

  const goNext = () => {
    if (activeStep === 1 && !hasCoreProducts) return;
    setActiveStep((step) => Math.min(5, step + 1));
  };

  const goBack = () => setActiveStep((step) => Math.max(1, step - 1));
  const jumpToStep = (step: number) => {
    if (step > 1 && !hasCoreProducts) return;
    if (step <= activeStep) setActiveStep(step);
  };

  return (
    <div id="productos" className={cn("overflow-hidden border border-black/10 bg-white", className)}>
      <span id="addons" className="sr-only" />
      <div className="border-b border-black/10 bg-[#f7f4ef] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">{t("businessLanding.pricing.configurator.eyebrow")}</p>
            <h2 className="mt-2 max-w-[22ch] font-heading text-balance text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-biz-heading-dark">
              {t("businessLanding.pricing.configurator.title")}
            </h2>
            <p className="mt-3 max-w-[54ch] text-base leading-7 text-slate-700">
              {t("businessLanding.pricing.configurator.description")}
            </p>
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{t("businessLanding.pricing.configurator.currentPrices")}</p>
        </div>

        <nav aria-label={t("businessLanding.pricing.configurator.progressAria")} className="mt-7">
          <ol className="grid grid-cols-5 gap-1">
            {STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isCurrent = activeStep === stepNumber;
              const isDone = activeStep > stepNumber;
              return (
                <li key={step.number} className="flex-1">
                  <button
                    type="button"
                    onClick={() => jumpToStep(stepNumber)}
                    disabled={stepNumber > activeStep || (stepNumber > 1 && !hasCoreProducts)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex min-h-12 w-full flex-col items-start justify-center gap-1 border-b-2 px-2 py-2 text-left transition-colors sm:min-h-14 sm:flex-row sm:items-center sm:gap-2 sm:px-3",
                      isCurrent ? "border-black bg-black text-white" : isDone ? "border-biz-barbie-pink bg-white text-black" : "border-black/10 bg-white text-slate-400",
                      stepNumber > activeStep && "cursor-not-allowed",
                    )}
                  >
                    <span className={cn("font-bebas text-lg leading-none sm:text-xl", isCurrent ? "text-biz-yellow" : isDone ? "text-biz-barbie-pink" : "text-slate-400")}>
                      {isDone ? "✓" : step.number}
                    </span>
                    <span className="text-[9px] font-black uppercase leading-tight tracking-[0.04em] sm:text-[10px] sm:tracking-[0.06em]">{t(`businessLanding.pricing.configurator.steps.${step.key}`)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className={cn("px-5 py-7 sm:px-7 sm:py-9", compact ? "bg-white" : "bg-white")}>
        {activeStep === 1 ? (
          <section aria-labelledby="pricing-step-products">
            <SectionIntro
              titleId="pricing-step-products"
              eyebrow={t("businessLanding.pricing.steps.products.eyebrow")}
              title={t("businessLanding.pricing.steps.products.title")}
              description={t("businessLanding.pricing.steps.products.description")}
            />
            {coreProducts.length > 0 ? (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {coreProducts.map((product) => (
                  <ProductChoice
                    key={product.key}
                    product={product}
                    selected={value.coreSelections.some((item) => item.productKey === product.key)}
                    onToggle={() => toggleCoreProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <PricingEmptyState
                title={t("businessLanding.pricing.empty.noProductsTitle")}
                description={t("businessLanding.pricing.empty.noProductsDescription")}
              />
            )}
          </section>
        ) : null}

        {activeStep === 2 ? (
          <section aria-labelledby="pricing-step-tiers">
            <SectionIntro
              titleId="pricing-step-tiers"
              eyebrow={t("businessLanding.pricing.steps.tiers.eyebrow")}
              title={t("businessLanding.pricing.steps.tiers.title")}
              description={t("businessLanding.pricing.steps.tiers.description")}
            />
            {hasCoreProducts ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {value.coreSelections.map((selection) => {
                  const product = productByKey.get(selection.productKey);
                  if (!product) return null;
                  return (
                    <TierChoice
                      key={selection.productKey}
                      product={product}
                      selection={selection}
                      onChoose={(tierKey) => setCoreSelection({ ...selection, tierKey })}
                    />
                  );
                })}
              </div>
            ) : (
              <PricingEmptyState
                title={t("businessLanding.pricing.empty.noCoreTitle")}
                description={t("businessLanding.pricing.empty.noCoreDescription")}
              />
            )}
          </section>
        ) : null}

        {activeStep === 3 ? (
          <section aria-labelledby="pricing-step-addons">
            <SectionIntro
              titleId="pricing-step-addons"
              eyebrow={t("businessLanding.pricing.steps.extras.eyebrow")}
              title={t("businessLanding.pricing.steps.extras.title")}
              description={t("businessLanding.pricing.steps.extras.description")}
            />
            {addOnProducts.length > 0 ? (
              <div className="mt-5 border-t border-black/10">
                {addOnProducts.map((product) => (
                  <AddOnRow
                    key={product.key}
                    product={product}
                    selected={value.addOns.includes(product.key as PublicAddOnKey)}
                    disabled={!hasCoreProducts || !product.isActive || product.isComingSoon}
                    onToggle={() => toggleAddOn(product.key as PublicAddOnKey)}
                  />
                ))}
              </div>
            ) : (
              <PricingEmptyState
                title={t("businessLanding.pricing.empty.noExtrasTitle")}
                description={t("businessLanding.pricing.empty.noExtrasDescription")}
              />
            )}
            <p className="mt-5 text-sm leading-6 text-slate-600">
              {t("businessLanding.pricing.steps.extras.continueHint")}
            </p>
          </section>
        ) : null}

        {activeStep === 4 ? (
          <section aria-labelledby="pricing-step-billing">
            <SectionIntro
              titleId="pricing-step-billing"
              eyebrow={t("businessLanding.pricing.steps.billing.eyebrow")}
              title={t("businessLanding.pricing.steps.billing.title")}
              description={t("businessLanding.pricing.steps.billing.description")}
            />
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <BillingChoice
                active={value.billingCycle === "monthly"}
                title={t("businessLanding.pricing.steps.billing.monthly")}
                price={formatBsAmount(pricing.finalMonthlyBeforeAnnual)}
                description={t("businessLanding.pricing.steps.billing.monthlyDescription")}
                detail={t("businessLanding.pricing.steps.billing.monthlyDetail")}
                onClick={() => onChange({ ...value, billingCycle: "monthly" })}
              />
              <BillingChoice
                active={value.billingCycle === "annual"}
                title={t("businessLanding.pricing.steps.billing.annualTitle", { discount: pricingConfig.discounts.annualDiscountPercent })}
                price={formatBsAmount(pricing.finalAnnualEquivalent / 12)}
                description={t("businessLanding.pricing.steps.billing.annualDescription", { discount: pricingConfig.discounts.annualDiscountPercent })}
                detail={t("businessLanding.pricing.steps.billing.annualDetail", { total: formatBsAmount(pricing.finalAnnualEquivalent) })}
                badge={t("businessLanding.pricing.steps.billing.recommended")}
                onClick={() => onChange({ ...value, billingCycle: "annual" })}
              />
            </div>
            <div className="mt-5 border border-black bg-biz-yellow p-4 text-black">
              <p className="text-[11px] font-black uppercase tracking-[0.08em]">{t("businessLanding.pricing.steps.billing.todayLabel")}</p>
              <p className="mt-2 font-business-display text-[2.2rem] uppercase leading-none">{t("businessLanding.pricing.steps.billing.todayAmount")}</p>
              <p className="mt-2 text-sm leading-6">{t("businessLanding.pricing.steps.billing.todayDescription")}</p>
            </div>
          </section>
        ) : null}

        {activeStep === 5 ? (
          <section aria-labelledby="pricing-step-summary" aria-live="polite" aria-atomic="true">
            <SectionIntro
              titleId="pricing-step-summary"
              eyebrow={t("businessLanding.pricing.steps.summary.eyebrow")}
              title={t("businessLanding.pricing.steps.summary.title")}
              description={t("businessLanding.pricing.steps.summary.description")}
            />
            <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
              <div className="border border-black bg-black p-5 text-white sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-5">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/55">{t("businessLanding.pricing.steps.summary.afterTrial")}</p>
                    <p className="mt-2 font-business-display text-[clamp(3rem,7vw,5.2rem)] uppercase leading-[0.82] tracking-[-0.04em] text-biz-yellow">
                      {formatBsAmount(pricing.finalMonthly)}
                    </p>
                    <p className="mt-3 text-sm text-white/65">{value.billingCycle === "annual" ? t("businessLanding.pricing.steps.summary.annualBilling") : t("businessLanding.pricing.steps.summary.monthlyBilling")}</p>
                    {value.billingCycle === "annual" ? (
                      <p className="mt-2 text-sm text-white/80">{t("businessLanding.pricing.steps.summary.annualTotal", { total: formatBsAmount(pricing.finalAnnualEquivalent) })}</p>
                    ) : null}
                  </div>
                  <span className="bg-biz-yellow px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-black">{t("businessLanding.pricing.steps.summary.trialBadge")}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {localizedSelectedProducts.map((item) => (
                    <span key={item} className="bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-black">{item}</span>
                  ))}
                </div>

                <details className="mt-5 border-t border-white/15 pt-4">
                  <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.08em] text-white/75">{t("businessLanding.pricing.steps.summary.breakdown")}</summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-white/60">{t("businessLanding.pricing.steps.summary.subtotal")}</span><span>{formatBsAmount(pricing.subtotalMonthly)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-white/60">{t("businessLanding.pricing.steps.summary.bundleDiscount")}</span><span>{pricing.bundleDiscountPercent > 0 ? `-${formatBsAmount(pricing.bundleDiscountAmount)}` : t("businessLanding.pricing.steps.summary.noDiscount")}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-white/60">{t("businessLanding.pricing.steps.summary.annualDiscount")}</span><span>{pricing.annualDiscountPercent > 0 ? `-${formatBsAmount(pricing.annualDiscountAmount)}` : t("businessLanding.pricing.steps.summary.noDiscount")}</span></div>
                  </div>
                </details>
              </div>

              <aside className="flex flex-col justify-between border border-black/15 bg-[#f7f4ef] p-5 sm:p-6">
                <div>
                  <p className="font-bebas text-[15px] uppercase tracking-[0.16em] text-biz-barbie-pink">{t("businessLanding.pricing.steps.summary.readyEyebrow")}</p>
                  <h4 className="mt-3 max-w-[16ch] font-heading text-balance text-[clamp(1.8rem,3.5vw,2.7rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{t("businessLanding.pricing.steps.summary.readyTitle")}</h4>
                  <p className="mt-4 text-base leading-7 text-slate-700">{t("businessLanding.pricing.steps.summary.readyDescription")}</p>
                </div>
                {onComplete ? (
                  <Button onClick={onComplete} className="mt-7 min-h-14 rounded-none bg-biz-cta-primary text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_0_rgba(5,5,5,0.12)] transition-transform hover:bg-biz-cta-hover hover:shadow-[0_4px_0_rgba(5,5,5,0.12)] active:translate-y-1 active:shadow-none">
                    {resolvedCtaLabel}<ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button asChild className="mt-7 min-h-14 rounded-none bg-biz-cta-primary text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_0_rgba(5,5,5,0.12)] transition-transform hover:bg-biz-cta-hover hover:shadow-[0_4px_0_rgba(5,5,5,0.12)] active:translate-y-1 active:shadow-none">
                    <Link href={ctaHref}>{resolvedCtaLabel}<ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                )}
              </aside>
            </div>
          </section>
        ) : null}

        {activeStep < 5 ? (
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={activeStep === 1}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-black/15 px-5 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("businessLanding.pricing.actions.back")}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={activeStep === 1 && !hasCoreProducts}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-biz-barbie-pink disabled:cursor-not-allowed disabled:opacity-35"
            >
              {activeStep === 3 ? t("businessLanding.pricing.actions.continueWithoutExtras") : activeStep === 4 ? t("businessLanding.pricing.actions.viewSummary") : t("businessLanding.pricing.actions.continue")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-black/10 pt-5">
            {[1, 2, 3, 4].map((step) => (
              <button key={step} type="button" onClick={() => jumpToStep(step)} className="min-h-11 border border-black/15 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-biz-yellow">
                {t("businessLanding.pricing.actions.edit", { step: t(`businessLanding.pricing.configurator.steps.${STEPS[step - 1].key}`) })}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
