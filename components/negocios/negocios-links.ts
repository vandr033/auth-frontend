export type NegociosNavLink = {
  label: string;
  href: string;
  id?: string;
};

export const negociosHeaderLinks: NegociosNavLink[] = [
  { id: "pricing", label: "Precios", href: "#pricing" },
  { id: "productos", label: "Productos", href: "#productos" },
  { id: "addons", label: "Extras", href: "#addons" },
  { id: "faq", label: "Preguntas", href: "#faq" },
];

export const negociosPlatformLinks: NegociosNavLink[] = [
  { label: "Reservas", href: "/negocios/reservas" },
  { label: "Eventos", href: "/negocios/eventos" },
  { label: "Clases", href: "/negocios/clases" },
  { label: "Tienda", href: "/negocios/tienda" },
];

export const negociosCompanyLinks: NegociosNavLink[] = [
  { label: "Personalización Pro", href: "/negocios/personalizacion-pro" },
  { label: "Métricas", href: "/negocios/metricas" },
  { label: "Mensajería Pro", href: "/negocios/mensajeria-recordatorios" },
  { label: "CRM Pro", href: "/negocios/crm-clientes" },
];
