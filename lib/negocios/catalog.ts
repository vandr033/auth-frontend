import {
  buildBusinessPricingProductMap,
  DEFAULT_BUSINESS_PRICING_CONFIG,
  type BusinessPricingConfig,
  type BusinessPricingTier,
  type PublicAddOnKey,
  type PublicCoreProductKey,
} from "@/lib/negocios/business-pricing";

export type NegociosProductCard = {
  key: PublicCoreProductKey | PublicAddOnKey;
  kind: "core" | "addon";
  title: string;
  shortTitle: string;
  slug: string;
  href: string;
  priceMonthly: number;
  tiers?: BusinessPricingTier[];
  tagline: string;
  description: string;
  bullets: string[];
  includedNote?: string;
  disabled?: boolean;
  badge?: string;
  heroTitle: string;
  heroDescription: string;
  forWho: string;
  includedItems: string[];
  recommendedCombos: string[];
  ctaLabel: string;
};

export const NEGOCIOS_HERO_COPY = {
  title: "Tu negocio, reservas, eventos, clases y clientes en un solo lugar.",
  description:
    "Activá los productos que necesitás, probá Priconpri gratis por un mes y empezá a operar con una página premium hecha para vender más.",
  primaryCta: "Probá gratis por un mes",
  secondaryCta: "Ver productos",
};

export const CORE_PRODUCTS: NegociosProductCard[] = [
  {
    key: "RESERVAS",
    kind: "core",
    title: "Reservas",
    shortTitle: "Reservas",
    slug: "reservas",
    href: "/negocios/reservas",
    priceMonthly: 300,
    tagline: "Para negocios que viven de citas, servicios y horarios.",
    description:
      "Reservas 1:1, servicios, staff, disponibilidad y operación diaria desde un panel que te deja trabajar con orden.",
    bullets: [
      "Reservas 1:1",
      "Servicios y categorías",
      "Personal y disponibilidad",
      "Confirmaciones",
      "Página pública para reservar",
      "Operación diaria desde el panel",
    ],
    heroTitle: "Reservas sin caos, sin chats perdidos y sin horarios duplicados.",
    heroDescription:
      "Organizá tus servicios, tu personal y tus horarios en una página lista para recibir reservas.",
    forWho:
      "Para estudios, clínicas, salones, centros de bienestar y negocios donde cada cita mueve ingresos reales.",
    includedItems: [
      "Reservas 1:1",
      "Servicios y categorías",
      "Staff y disponibilidad",
      "Confirmaciones y operación diaria",
      "Página pública para reservar",
    ],
    recommendedCombos: [
      "Mensajería / Recordatorios Pro",
      "Métricas",
      "CRM / Clientes Pro",
    ],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "EVENTOS",
    kind: "core",
    title: "Eventos",
    shortTitle: "Eventos",
    slug: "eventos",
    href: "/negocios/eventos",
    priceMonthly: 300,
    tagline:
      "Para vender entradas, registrar asistentes y manejar eventos sin planillas eternas.",
    description:
      "Centralizá registros, interesados, asistencia y eventos pagos o gratuitos en un solo flujo.",
    bullets: [
      "Eventos pagados",
      "Eventos gratuitos",
      "Formularios de registro",
      "Lista de interesados",
      "Control de asistencia",
      "Tickets y códigos si están disponibles",
    ],
    heroTitle: "Vendé entradas, registrá asistentes y manejá eventos desde un solo lugar.",
    heroDescription:
      "Desde eventos gratuitos hasta experiencias pagadas, centralizá registros, interesados y asistencia.",
    forWho:
      "Para experiencias en vivo, workshops, activaciones, lanzamientos y cualquier negocio que necesite ordenar cupos y asistencia.",
    includedItems: [
      "Eventos pagos y gratuitos",
      "Registros e interesados",
      "Capacidad y asistencia",
      "Tickets o códigos si están habilitados",
      "Flujo de confirmación",
    ],
    recommendedCombos: [
      "Mensajería / Recordatorios Pro",
      "CRM / Clientes Pro",
      "Métricas",
    ],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "CLASES",
    kind: "core",
    title: "Clases",
    shortTitle: "Clases",
    slug: "clases",
    href: "/negocios/clases",
    priceMonthly: 300,
    tagline:
      "Para operar clases recurrentes, sesiones, alumnos y asistencia.",
    description:
      "Manejás horarios, inscripciones, sesiones y asistencia desde un panel pensado para la operación real.",
    bullets: [
      "Clases recurrentes",
      "Sesiones",
      "Inscripciones",
      "Asistencia",
      "Cuotas si están disponibles",
      "Recordatorios operativos",
    ],
    heroTitle:
      "Clases recurrentes, alumnos, sesiones y asistencia sin planillas eternas.",
    heroDescription:
      "Manejás horarios, inscripciones, sesiones y asistencia desde un solo panel.",
    forWho:
      "Para gimnasios, estudios, academias y programas recurrentes donde la continuidad importa tanto como la venta.",
    includedItems: [
      "Clases recurrentes",
      "Sesiones e inscripciones",
      "Asistencia",
      "Cuotas si están disponibles",
      "Operación diaria desde el panel",
    ],
    recommendedCombos: [
      "Mensajería / Recordatorios Pro",
      "Métricas",
      "CRM / Clientes Pro",
    ],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "TIENDA",
    kind: "core",
    title: "Tienda",
    shortTitle: "Tienda",
    slug: "tienda",
    href: "/negocios/tienda",
    priceMonthly: 300,
    tagline: "Catálogo, pedidos y checkout QR para vender desde tu propia página.",
    description:
      "Vendé productos con catálogo, combos, stock, pickup, delivery y pedidos conectados a tu storefront en Priconpri.",
    bullets: [
      "Productos y categorías",
      "Stock global",
      "Combos estructurados",
      "Pickup y delivery",
      "Checkout invitado",
      "QR manual",
    ],
    heroTitle: "Tu tienda online vive dentro de Priconpri, no al costado.",
    heroDescription:
      "Armá tu catálogo, recibí pedidos y gestioná pickup o delivery con checkout QR desde la misma página pública de tu negocio.",
    forWho:
      "Para negocios que quieren sumar venta de productos sin salirse del universo Priconpri.",
    includedItems: [
      "Productos y categorías",
      "Stock global",
      "Combos estructurados",
      "Pickup",
      "Delivery",
      "Checkout invitado",
      "QR manual",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear mi cuenta gratis",
  },
];

export const ADD_ONS: NegociosProductCard[] = [
  {
    key: "PERSONALIZACION_PRO",
    kind: "addon",
    title: "Personalización Pro",
    shortTitle: "Personalización Pro",
    slug: "personalizacion-pro",
    href: "/negocios/personalizacion-pro",
    priceMonthly: 400,
    tagline: "Una página que no parece plantilla.",
    description:
      "Dale más control visual a tu página pública con CTAs, layouts, footer, anuncios y secciones más flexibles.",
    bullets: [
      "CTA avanzado",
      "Layouts",
      "Footer",
      "Anuncios",
      "Orden de secciones",
      "Branding visual",
    ],
    includedNote: "Personalización Base incluida por defecto.",
    heroTitle: "Una página que no parece plantilla.",
    heroDescription:
      "Dale más control visual a tu página pública con CTAs, layouts, footer, anuncios y secciones más flexibles.",
    forWho:
      "Para marcas que no quieren verse genéricas y necesitan que su página venda con la misma energía que su negocio.",
    includedItems: [
      "CTA avanzado",
      "Layouts",
      "Footer",
      "Anuncios",
      "Orden de secciones",
      "Branding visual",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "METRICAS",
    kind: "addon",
    title: "Métricas",
    shortTitle: "Métricas",
    slug: "metricas",
    href: "/negocios/metricas",
    priceMonthly: 250,
    tagline: "Tomá decisiones con números, no con intuición.",
    description:
      "Entendé qué se vende, cuándo se mueve tu negocio, quién vuelve y dónde podés mejorar.",
    bullets: [
      "Reservas",
      "Ingresos",
      "Servicios top",
      "Personal top",
      "Clientes",
      "Reseñas",
      "Eventos y clases si están habilitados",
    ],
    includedNote: "Métricas es un add-on.",
    heroTitle: "Tomá decisiones con números, no con intuición.",
    heroDescription:
      "Entendé qué se vende, cuándo se mueve tu negocio, quién vuelve y dónde podés mejorar.",
    forWho:
      "Para equipos que quieren crecimiento con criterio y no a ciegas.",
    includedItems: [
      "Reservas",
      "Ingresos",
      "Servicios top",
      "Personal top",
      "Clientes",
      "Reseñas",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "MENSAJERIA_PRO",
    kind: "addon",
    title: "Mensajería / Recordatorios Pro",
    shortTitle: "Mensajería Pro",
    slug: "mensajeria-recordatorios",
    href: "/negocios/mensajeria-recordatorios",
    priceMonthly: 300,
    tagline: "Menos ausencias, más recompra y clientes mejor atendidos.",
    description:
      "Automatizá recordatorios, campañas, reseñas y mensajes para que tu operación no dependa de hacerlo todo a mano.",
    bullets: [
      "Recordatorios",
      "Campañas",
      "Solicitudes de reseña",
      "WhatsApp y email outreach",
      "Comunicación masiva",
    ],
    includedNote: "Mensajería Base incluida por defecto.",
    heroTitle: "Menos ausencias, más recompra y clientes mejor atendidos.",
    heroDescription:
      "Automatizá recordatorios, campañas, reseñas y mensajes para que tu operación no dependa de hacerlo todo a mano.",
    forWho:
      "Para negocios que quieren comunicación activa, menos no-shows y más recompra.",
    includedItems: [
      "Recordatorios",
      "Campañas",
      "Solicitudes de reseña",
      "WhatsApp y email outreach",
      "Comunicación masiva",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear mi cuenta gratis",
  },
  {
    key: "CRM_PRO",
    kind: "addon",
    title: "CRM / Clientes Pro",
    shortTitle: "CRM Pro",
    slug: "crm-clientes",
    href: "/negocios/crm-clientes",
    priceMonthly: 250,
    tagline: "Tus clientes no deberían vivir perdidos en chats.",
    description:
      "Ordená tu base de clientes, entendé su historial y reactivá oportunidades desde un solo lugar.",
    bullets: [
      "Historial",
      "Segmentación",
      "Importación y exportación",
      "Reactivación",
      "Clientes por producto, evento o clase",
    ],
    includedNote: "CRM Base incluido por defecto.",
    heroTitle: "Tus clientes no deberían vivir perdidos en chats.",
    heroDescription:
      "Ordená tu base de clientes, entendé su historial y reactivá oportunidades desde un solo lugar.",
    forWho:
      "Para negocios que quieren relaciones más largas, mejor seguimiento y menos caos en WhatsApp.",
    includedItems: [
      "Historial",
      "Segmentación",
      "Importación y exportación",
      "Reactivación",
      "Clientes por producto, evento o clase",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear mi cuenta gratis",
  },
];

export const ALL_NEGOCIOS_PRODUCTS = [...CORE_PRODUCTS, ...ADD_ONS];

export function applyPricingConfigToCatalog(
  pricingConfig: BusinessPricingConfig = DEFAULT_BUSINESS_PRICING_CONFIG,
) {
  const pricingByKey = buildBusinessPricingProductMap(pricingConfig);

  const applyProductPricing = (product: NegociosProductCard): NegociosProductCard => {
    const pricingProduct = pricingByKey.get(product.key);
    if (!pricingProduct) return product;

    const isDisabled = !pricingProduct.isActive || pricingProduct.isComingSoon;

    return {
      ...product,
      priceMonthly: pricingProduct.monthlyPriceBs,
      tiers: pricingProduct.tiers,
      disabled: isDisabled,
      badge: pricingProduct.isComingSoon ? "Próximamente" : product.badge,
      title: pricingProduct.displayName || product.title,
      shortTitle: pricingProduct.displayName || product.shortTitle,
      tagline: pricingProduct.description || product.tagline,
      bullets: pricingProduct.tiers?.[0]?.featureList?.length
        ? pricingProduct.tiers[0].featureList
        : pricingProduct.featureList?.length
          ? pricingProduct.featureList
          : product.bullets,
      includedNote: pricingProduct.includedNote || product.includedNote,
    };
  };

  return {
    coreProducts: CORE_PRODUCTS.map(applyProductPricing),
    addOns: ADD_ONS.map(applyProductPricing),
    allProducts: ALL_NEGOCIOS_PRODUCTS.map(applyProductPricing),
  };
}

export function getNegociosProductBySlug(slug: string) {
  return applyPricingConfigToCatalog().allProducts.find((product) => product.slug === slug) ?? null;
}

export function getNegociosProductByKey(key: PublicCoreProductKey | PublicAddOnKey) {
  return applyPricingConfigToCatalog().allProducts.find((product) => product.key === key) ?? null;
}
