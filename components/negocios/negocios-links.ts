export type NegociosNavLink = {
  labelKey: string;
  href: string;
  id?: string;
};

export const negociosHeaderLinks: NegociosNavLink[] = [
  { id: "pricing", labelKey: "businessLanding.nav.pricing", href: "#pricing" },
  { id: "productos", labelKey: "businessLanding.nav.products", href: "#productos" },
  { labelKey: "businessLanding.nav.liveDemo", href: "/demo" },
  { id: "addons", labelKey: "businessLanding.nav.extras", href: "#addons" },
  { id: "faq", labelKey: "businessLanding.nav.faq", href: "#faq" },
];

export const negociosPlatformLinks: NegociosNavLink[] = [
  { labelKey: "businessLanding.footer.liveDemo", href: "/demo" },
  { labelKey: "businessLanding.footer.reservations", href: "/negocios/reservas" },
  { labelKey: "businessLanding.footer.restaurant", href: "/negocios/restaurante" },
  { labelKey: "businessLanding.footer.events", href: "/negocios/eventos" },
  { labelKey: "businessLanding.footer.classes", href: "/negocios/clases" },
  { labelKey: "businessLanding.footer.store", href: "/negocios/tienda" },
];

export const negociosCompanyLinks: NegociosNavLink[] = [
  { labelKey: "businessLanding.footer.customizationPro", href: "/negocios/personalizacion-pro" },
  { labelKey: "businessLanding.footer.metrics", href: "/negocios/metricas" },
  { labelKey: "businessLanding.footer.crmPro", href: "/demo/addons/crm" },
];
