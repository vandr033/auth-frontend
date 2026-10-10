export type DemoProfileKey = "reservas" | "restaurante" | "eventos" | "clases" | "tienda" | "completo";

export const demoProducts = [
    {
        key: "reservas",
        number: "01",
        name: "Reservas",
        company: "Atelier 27",
        href: "/demo/reservas",
        publicDestination: "/shop/atelier-27-demo/services",
        customerFlow: "Encontrá un servicio, elegí profesional, fecha y horario.",
        adminFlow: "Revisá la agenda, los clientes, el equipo y la operación diaria.",
        summary: "Una agenda clara para tu equipo y sencilla para cada cliente.",
        actionLabel: "la reserva",
    },
    {
        key: "restaurante",
        number: "02",
        name: "Restaurante",
        company: "Casa Patio",
        href: "/demo/restaurante",
        publicDestination: "/shop/casa-patio-demo/menu",
        customerFlow: "Explorá el menú y recorré el flujo de un pedido.",
        adminFlow: "Mirá las reservas, mesas, menú y operación del restaurante.",
        summary: "Reservas y operación conectadas con la experiencia de cada mesa.",
        actionLabel: "la reserva",
    },
    {
        key: "eventos",
        number: "03",
        name: "Eventos",
        company: "Distrito",
        href: "/demo/eventos",
        publicDestination: "/shop/distrito-demo/events",
        customerFlow: "Descubrí un evento y revisá cómo funciona el registro.",
        adminFlow: "Administrá eventos, asistentes, comunicaciones y operación.",
        summary: "Cada fecha, cupo y registro en un mismo lugar.",
        actionLabel: "el registro",
    },
    {
        key: "clases",
        number: "04",
        name: "Clases",
        company: "Forma Studio",
        href: "/demo/clases",
        publicDestination: "/shop/forma-studio-demo/classes",
        customerFlow: "Encontrá una clase y revisá sus horarios y cupos.",
        adminFlow: "Organizá clases, inscripciones, asistencia y equipo.",
        summary: "Horarios y cupos visibles para alumnos y equipo.",
        actionLabel: "la inscripción",
    },
    {
        key: "tienda",
        number: "05",
        name: "Tienda",
        company: "Nativa",
        href: "/demo/tienda",
        publicDestination: "/shop/nativa-demo/store",
        customerFlow: "Recorré el catálogo y prepará una compra de ejemplo.",
        adminFlow: "Gestioná productos, pedidos, puntos de venta e inventario.",
        summary: "Catálogo, compras y pedidos conectados con tu operación.",
        actionLabel: "la compra",
    },
] as const;

export type DemoProduct = (typeof demoProducts)[number];
export type DemoProductKey = DemoProduct["key"];

export const completeDemoProduct = {
    key: "completo",
    number: "06",
    name: "Suite completa",
    company: "Club Horizonte",
    href: "/demo/completo",
    publicDestination: "/shop/club-horizonte-demo",
    customerFlow: "Explorá el sitio de Club Horizonte y descubrí sus servicios, actividades y tienda.",
    adminFlow: "Recorré reservas, restaurante, eventos, clases, tienda, CRM, métricas y branding.",
    summary: "Todos los productos y add-ons conectados en una misma empresa.",
    actionLabel: "la operación",
} as const;

export type DemoExperience = DemoProduct | typeof completeDemoProduct;

export const demoAddons = [
    {
        key: "crm",
        number: "A1",
        name: "CRM + Mensajería",
        href: "/demo/addons/crm",
        adminDestination: "/admin/dashboard/customers",
        summary: "Conocé a tus clientes y continuá la conversación desde PriConPri.",
    },
    {
        key: "metricas",
        number: "A2",
        name: "Métricas",
        href: "/demo/addons/metricas",
        adminDestination: "/admin/dashboard",
        summary: "Leé la actividad de tu negocio desde el panel real.",
    },
    {
        key: "branding",
        number: "A3",
        name: "Personalización / Branding",
        href: "/demo/addons/branding",
        adminDestination: "/admin/dashboard/storefront/appearance",
        summary: "Ajustá la presencia digital para que se sienta como tu marca.",
    },
] as const;

export type DemoAddon = (typeof demoAddons)[number];

export const completeDemoNavigation = [
    { label: "Reservas", href: "/admin/dashboard/bookings" },
    { label: "Restaurante", href: "/admin/dashboard/restaurant" },
    { label: "Eventos", href: "/admin/dashboard/group-reservations/events" },
    { label: "Clases", href: "/admin/dashboard/group-reservations/classes" },
    { label: "Tienda", href: "/admin/dashboard/store" },
    { label: "CRM + Mensajería", href: "/admin/dashboard/customers" },
    { label: "Métricas", href: "/admin/dashboard" },
    { label: "Branding", href: "/admin/dashboard/storefront/appearance" },
] as const;

export function getDemoProduct(key: string): DemoProduct | undefined {
    return demoProducts.find((product) => product.key === key);
}

export function getDemoAddon(key: string): DemoAddon | undefined {
    return demoAddons.find((addon) => addon.key === key);
}

export type DemoOperation = "reservation" | "order" | "class-registration" | "event-registration" | "purchase";

const demoActionLabels: Record<DemoOperation, string> = {
    reservation: "la reserva",
    order: "el pedido",
    "class-registration": "la inscripción a la clase",
    "event-registration": "el registro al evento",
    purchase: "la compra",
};

export function getDemoActionLabel(operation: DemoOperation): string {
    return demoActionLabels[operation];
}
