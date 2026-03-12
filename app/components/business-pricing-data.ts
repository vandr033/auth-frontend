export type BusinessPlanId = "starter" | "business" | "pro";
export type BillingCycle = "monthly" | "yearly";

export type BusinessPricingSummaryPlan = {
  id: BusinessPlanId;
  featured: boolean;
  nameKey: string;
  descriptionKey: string;
  priceKeys: Record<BillingCycle, string>;
  highlightKeys: string[];
  ctaKey: string;
  ctaHref: string;
};

export type CompareCell =
  | {
      type: "boolean";
      value: boolean;
    }
  | {
      type: "text";
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
export const BUSINESS_DEMO_PATH = "https://cal.com/priconpri/demo";

export const businessPricingSummaryPlans: BusinessPricingSummaryPlan[] = [
  {
    id: "starter",
    featured: false,
    nameKey: "businessPricing.plans.starter.name",
    descriptionKey: "businessPricing.plans.starter.description",
    priceKeys: {
      monthly: "businessPricing.plans.starter.prices.monthly",
      yearly: "businessPricing.plans.starter.prices.yearly",
    },
    highlightKeys: [
      "businessPricing.plans.starter.highlights.0",
      "businessPricing.plans.starter.highlights.1",
      "businessPricing.plans.starter.highlights.2",
    ],
    ctaKey: "businessPricing.plans.cta",
    ctaHref: BUSINESS_DEMO_PATH,
  },
  {
    id: "business",
    featured: true,
    nameKey: "businessPricing.plans.business.name",
    descriptionKey: "businessPricing.plans.business.description",
    priceKeys: {
      monthly: "businessPricing.plans.business.prices.monthly",
      yearly: "businessPricing.plans.business.prices.yearly",
    },
    highlightKeys: [
      "businessPricing.plans.business.highlights.0",
      "businessPricing.plans.business.highlights.1",
      "businessPricing.plans.business.highlights.2",
    ],
    ctaKey: "businessPricing.plans.cta",
    ctaHref: BUSINESS_DEMO_PATH,
  },
  {
    id: "pro",
    featured: false,
    nameKey: "businessPricing.plans.pro.name",
    descriptionKey: "businessPricing.plans.pro.description",
    priceKeys: {
      monthly: "businessPricing.plans.pro.prices.monthly",
      yearly: "businessPricing.plans.pro.prices.yearly",
    },
    highlightKeys: [
      "businessPricing.plans.pro.highlights.0",
      "businessPricing.plans.pro.highlights.1",
      "businessPricing.plans.pro.highlights.2",
    ],
    ctaKey: "businessPricing.plans.cta",
    ctaHref: BUSINESS_DEMO_PATH,
  },
];

export const businessPricingCompareCategories: BusinessPricingCompareCategory[] = [
  {
    id: "team",
    titleKey: "businessPricing.comparison.categories.team",
    features: [
      {
        key: "businessPricing.comparison.rows.staffUsers",
        values: {
          starter: { type: "text", valueKey: "businessPricing.comparison.values.upTo3" },
          business: { type: "text", valueKey: "businessPricing.comparison.values.upTo10" },
          pro: { type: "text", valueKey: "businessPricing.comparison.values.unlimited" },
        },
      },
      {
        key: "businessPricing.comparison.rows.rolesPermissions",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.staffAvailability",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "bookings",
    titleKey: "businessPricing.comparison.categories.bookings",
    features: [
      {
        key: "businessPricing.comparison.rows.onlineBooking",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.smartAvailability",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.appointmentLifecycle",
        values: {
          starter: { type: "text", valueKey: "businessPricing.comparison.values.basic" },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.bookingReminders",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "publicPage",
    titleKey: "businessPricing.comparison.categories.publicPage",
    features: [
      {
        key: "businessPricing.comparison.rows.publicPage",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.branding",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.marketplacePresence",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "crm",
    titleKey: "businessPricing.comparison.categories.crm",
    features: [
      {
        key: "businessPricing.comparison.rows.customerDatabase",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.customerMetrics",
        values: {
          starter: { type: "text", valueKey: "businessPricing.comparison.values.basic" },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.customerImportExport",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "notifications",
    titleKey: "businessPricing.comparison.categories.notifications",
    features: [
      {
        key: "businessPricing.comparison.rows.transactionalNotifications",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.staffClientReminders",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "reporting",
    titleKey: "businessPricing.comparison.categories.reporting",
    features: [
      {
        key: "businessPricing.comparison.rows.basicMetrics",
        values: {
          starter: { type: "boolean", value: true },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.operationalDashboard",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: true },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "growth",
    titleKey: "businessPricing.comparison.categories.growth",
    features: [
      {
        key: "businessPricing.comparison.rows.bulkWhatsapp",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.bulkEmail",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          pro: { type: "boolean", value: true },
        },
      },
      {
        key: "businessPricing.comparison.rows.outreach",
        values: {
          starter: { type: "boolean", value: false },
          business: { type: "boolean", value: false },
          pro: { type: "boolean", value: true },
        },
      },
    ],
  },
  {
    id: "support",
    titleKey: "businessPricing.comparison.categories.support",
    features: [
      {
        key: "businessPricing.comparison.rows.support",
        values: {
          starter: { type: "text", valueKey: "businessPricing.comparison.values.standard" },
          business: { type: "text", valueKey: "businessPricing.comparison.values.priority" },
          pro: { type: "text", valueKey: "businessPricing.comparison.values.priority" },
        },
      },
    ],
  },
];
