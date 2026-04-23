export type NegociosSectionLink = {
  id: string;
  label: string;
};

// Derived from discovered /negocios sections only.
export const negociosSectionLinks: NegociosSectionLink[] = [
  { id: "inicio", label: "Inicio" },
  { id: "sectores", label: "Sectores" },
  { id: "beneficios", label: "Beneficios" },
  { id: "funcionalidades", label: "Funciones" },
  { id: "clientes", label: "Clientes" },
  { id: "staff", label: "Equipo" },
  { id: "branding", label: "Branding" },
  { id: "empezar", label: "Empezar" },
  { id: "precios", label: "Precios" },
  { id: "demo", label: "Demo" },
];

export const negociosHeaderLinks: NegociosSectionLink[] = [
  { id: "sectores", label: "Sectores" },
  { id: "funcionalidades", label: "Funciones" },
  { id: "precios", label: "Precios" },
  { id: "clientes", label: "Clientes" },
  { id: "empezar", label: "Empezar" },
];

export const negociosPlatformLinks: NegociosSectionLink[] = [
  { id: "funcionalidades", label: "Funciones" },
  { id: "precios", label: "Precios" },
  { id: "staff", label: "Equipo" },
  { id: "branding", label: "Branding" },
];

export const negociosCompanyLinks: NegociosSectionLink[] = [
  { id: "clientes", label: "Clientes" },
  { id: "empezar", label: "Empezar" },
  { id: "beneficios", label: "Beneficios" },
  { id: "demo", label: "Contacto" },
];
