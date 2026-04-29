export type PublicCoreProductKey = "RESERVAS" | "EVENTOS" | "CLASES" | "TIENDA";
export type SelectableCoreProductKey = Exclude<PublicCoreProductKey, "TIENDA">;
export type PublicAddOnKey =
  | "PERSONALIZACION_PRO"
  | "METRICAS"
  | "MENSAJERIA_PRO"
  | "CRM_PRO";

export type PricingBillingCycle = "monthly" | "annual";

export type NegociosProductCard = {
  key: PublicCoreProductKey | PublicAddOnKey;
  kind: "core" | "addon";
  title: string;
  shortTitle: string;
  slug: string;
  href: string;
  priceMonthly: number;
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
    tagline: "Tu tienda online en Priconpri está en camino.",
    description:
      "Muy pronto vas a poder vender productos, recibir pedidos y mandar clientes directo a WhatsApp desde tu página.",
    bullets: [
      "Productos y categorías",
      "Pickup y delivery",
      "Pedidos programados",
      "Checkout por WhatsApp",
    ],
    disabled: true,
    badge: "Próximamente",
    heroTitle: "Tu tienda online en Priconpri está en camino.",
    heroDescription:
      "Muy pronto vas a poder vender productos, recibir pedidos y mandar clientes directo a WhatsApp desde tu página.",
    forWho:
      "Para negocios que quieren sumar venta de productos sin salirse del universo Priconpri.",
    includedItems: [
      "Productos y categorías",
      "Pickup",
      "Delivery",
      "Pedidos programados",
      "Checkout por WhatsApp",
    ],
    recommendedCombos: ["Reservas", "Eventos", "Clases"],
    ctaLabel: "Crear cuenta con otro producto",
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

export function getNegociosProductBySlug(slug: string) {
  return ALL_NEGOCIOS_PRODUCTS.find((product) => product.slug === slug) ?? null;
}

export function getNegociosProductByKey(key: PublicCoreProductKey | PublicAddOnKey) {
  return ALL_NEGOCIOS_PRODUCTS.find((product) => product.key === key) ?? null;
}
