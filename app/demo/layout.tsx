import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Demo – Panel de Administración | PriConPri",
    description:
        "Explora el panel de administración de PriConPri con datos de ejemplo. Mira cómo gestionas reservas, clientes, servicios y más.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
