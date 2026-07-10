export type NegociosNavLink = {
  labelKey: string;
  href: string;
  id?: string;
};

export const negociosHeaderLinks: NegociosNavLink[] = [
  { id: "pricing", labelKey: "businessLanding.nav.pricing", href: "#pricing" },
  { id: "productos", labelKey: "businessLanding.nav.products", href: "#productos" },
  { id: "addons", labelKey: "businessLanding.nav.extras", href: "#addons" },
  { id: "faq", labelKey: "businessLanding.nav.faq", href: "#faq" },
];

export const negociosPlatformLinks: NegociosNavLink[] = [
  { labelKey: "businessLanding.footer.reservations", href: "/negocios/reservas" },
  { labelKey: "businessLanding.footer.events", href: "/negocios/eventos" },
  { labelKey: "businessLanding.footer.classes", href: "/negocios/clases" },
  { labelKey: "businessLanding.footer.store", href: "/negocios/tienda" },
];

export const negociosCompanyLinks: NegociosNavLink[] = [
  { labelKey: "businessLanding.footer.customizationPro", href: "/negocios/personalizacion-pro" },
  { labelKey: "businessLanding.footer.metrics", href: "/negocios/metricas" },
  { labelKey: "businessLanding.footer.messagingPro", href: "/negocios/mensajeria-recordatorios" },
  { labelKey: "businessLanding.footer.crmPro", href: "/negocios/crm-clientes" },
];
