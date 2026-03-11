export type BusinessPlanId = "starter" | "business" | "enterprise";

export type BusinessPricingSummaryPlan = {
  id: BusinessPlanId;
  featured: boolean;
  nameKey: string;
  priceMainKey: string;
  priceSuffixKey: string;
  descriptionKey: string;
  featureKeys: string[];
  summaryHighlightKeys: string[];
  ctaKey: string;
  ctaHref: string;
};

export type CompareCell =
  | {
      type: "boolean";
      value: boolean;
    }
  | {
      type: "limit" | "text" | "custom";
      valueKey: string;
    };

export type BusinessPricingCompareFeature = {
  key: string;
  values: Record<BusinessPlanId, CompareCell>;
};

export type BusinessPricingCompareCategory = {
  id: string;
  titleKey: string;
  features: BusinessPricingCompareFeature[];
};

export const BUSINESS_COMPARE_PATH = "/negocios/precios";

export const businessPricingSummaryPlans: BusinessPricingSummaryPlan[] = [
  {
    id: "starter",
    featured: false,
    nameKey: "businessPricing.plans.starter.name",
    priceMainKey: "businessPricing.plans.starter.priceMain",
    priceSuffixKey: "businessPricing.plans.starter.priceSuffix",
    descriptionKey: "businessPricing.plans.starter.description",
    featureKeys: [
      "businessPricing.plans.starter.features.staff",
      "businessPricing.plans.starter.features.bookings",
      "businessPricing.plans.starter.features.landing",
      "businessPricing.plans.starter.features.metrics",
    ],
    summaryHighlightKeys: [
      "businessPricing.plans.starter.highlights.h1",
      "businessPricing.plans.starter.highlights.h2",
      "businessPricing.plans.starter.highlights.h3",
    ],
    ctaKey: "businessPricing.plans.starter.cta",
    ctaHref: "/contact",
  },
  {
    id: "business",
    featured: true,
    nameKey: "businessPricing.plans.business.name",
    priceMainKey: "businessPricing.plans.business.priceMain",
    priceSuffixKey: "businessPricing.plans.business.priceSuffix",
    descriptionKey: "businessPricing.plans.business.description",
    featureKeys: [
      "businessPricing.plans.business.features.staff",
      "businessPricing.plans.business.features.reminders",
      "businessPricing.plans.business.features.branding",
      "businessPricing.plans.business.features.metrics",
      "businessPricing.plans.business.features.support",
    ],
    summaryHighlightKeys: [
      "businessPricing.plans.business.highlights.h1",
      "businessPricing.plans.business.highlights.h2",
      "businessPricing.plans.business.highlights.h3",
    ],
    ctaKey: "businessPricing.plans.business.cta",
    ctaHref: "/contact",
  },
  {
    id: "enterprise",
    featured: false,
    nameKey: "businessPricing.plans.enterprise.name",
    priceMainKey: "businessPricing.plans.enterprise.priceMain",
    priceSuffixKey: "businessPricing.plans.enterprise.priceSuffix",
    descriptionKey: "businessPricing.plans.enterprise.description",
    featureKeys: [
      "businessPricing.plans.enterprise.features.staff",
      "businessPricing.plans.enterprise.features.api",
      "businessPricing.plans.enterprise.features.manager",
      "businessPricing.plans.enterprise.features.integrations",
      "businessPricing.plans.enterprise.features.multilocation",
    ],
    summaryHighlightKeys: [
      "businessPricing.plans.enterprise.highlights.h1",
      "businessPricing.plans.enterprise.highlights.h2",
      "businessPricing.plans.enterprise.highlights.h3",
    ],
    ctaKey: "businessPricing.plans.enterprise.cta",
    ctaHref: "/contact",
  },
];

export const businessPricingCompareCategories: BusinessPricingCompareCategory[] = [
  {
    id: "staff",
    titleKey: "businessPricing.compare.categories.staff",
    features: [
      {
        key: "businessPricing.compare.features.staffUsers",
        values: {
          starter: { type: "limit", valueKey: "businessPricing.compare.values.upTo3" },
          business: { type: "limit", valueKey: "businessPricing.compare.values.upTo10" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.unlimited" },
        },
      },
      {
        key: "businessPricing.compare.features.rolesPermissions",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.userAccessControl",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.basic" },
          business: { type: "text", valueKey: "businessPricing.compare.values.advanced" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.enterprise" },
        },
      },
      {
        key: "businessPricing.compare.features.branchManagement",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "bookings",
    titleKey: "businessPricing.compare.categories.bookings",
    features: [
      {
        key: "businessPricing.compare.features.monthlyBookings",
        values: {
          starter: { type: "limit", valueKey: "businessPricing.compare.values.upTo300Bookings" },
          business: { type: "limit", valueKey: "businessPricing.compare.values.upTo1500Bookings" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.customVolume" },
        },
      },
      {
        key: "businessPricing.compare.features.onlineCalendar",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.reschedules",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.capacityControl",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.basic" },
          business: { type: "text", valueKey: "businessPricing.compare.values.advanced" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.customRules" },
        },
      },
    ],
  },
  {
    id: "branding",
    titleKey: "businessPricing.compare.categories.branding",
    features: [
      {
        key: "businessPricing.compare.features.publicLanding",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.logoColorsTypography",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.basic" },
          business: { type: "text", valueKey: "businessPricing.compare.values.advanced" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.fullCustom" },
        },
      },
      {
        key: "businessPricing.compare.features.layouts",
        values: {
          starter: { type: "limit", valueKey: "businessPricing.compare.values.standardLayouts" },
          business: { type: "limit", valueKey: "businessPricing.compare.values.proLayouts" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.customLayouts" },
        },
      },
      {
        key: "businessPricing.compare.features.customDomain",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "notifications",
    titleKey: "businessPricing.compare.categories.notifications",
    features: [
      {
        key: "businessPricing.compare.features.emailAutomation",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.smsReminders",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.reminderTemplates",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.basic" },
          business: { type: "text", valueKey: "businessPricing.compare.values.advanced" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.custom" },
        },
      },
      {
        key: "businessPricing.compare.features.clientMessages",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "crm",
    titleKey: "businessPricing.compare.categories.crm",
    features: [
      {
        key: "businessPricing.compare.features.clientDatabase",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.visitHistory",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.segmentation",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.internalNotes",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "metrics",
    titleKey: "businessPricing.compare.categories.metrics",
    features: [
      {
        key: "businessPricing.compare.features.basicMetrics",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.operationalMetrics",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.salesInsights",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.dataExport",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "text", valueKey: "businessPricing.compare.values.csv" },
          enterprise: { type: "text", valueKey: "businessPricing.compare.values.csvApi" },
        },
      },
    ],
  },
  {
    id: "integrations",
    titleKey: "businessPricing.compare.categories.integrations",
    features: [
      {
        key: "businessPricing.compare.features.apiAccess",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.webhooks",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.customIntegrations",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.customIntegrations" },
        },
      },
    ],
  },
  {
    id: "support",
    titleKey: "businessPricing.compare.categories.support",
    features: [
      {
        key: "businessPricing.compare.features.supportChannel",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.standard" },
          business: { type: "text", valueKey: "businessPricing.compare.values.priority" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.accountManager" },
        },
      },
      {
        key: "businessPricing.compare.features.onboarding",
        values: {
          starter: { type: "text", valueKey: "businessPricing.compare.values.guided" },
          business: { type: "text", valueKey: "businessPricing.compare.values.personalized" },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.enterpriseOnboarding" },
        },
      },
      {
        key: "businessPricing.compare.features.sla",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.slaEnterprise" },
        },
      },
    ],
  },
  {
    id: "multiLocation",
    titleKey: "businessPricing.compare.categories.multiLocation",
    features: [
      {
        key: "businessPricing.compare.features.multiLocation",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.centralizedOps",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.compare.features.branchPermissions",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "advanced",
    titleKey: "businessPricing.compare.categories.advanced",
    features: [
      {
        key: "businessPricing.compare.features.customWorkflows",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.customWorkflows" },
        },
      },
      {
        key: "businessPricing.compare.features.dedicatedEnvironment",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.dedicatedEnvironment" },
        },
      },
      {
        key: "businessPricing.compare.features.dataMigration",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          enterprise: { type: "custom", valueKey: "businessPricing.compare.values.dataMigration" },
        },
      },
    ],
  },
];
