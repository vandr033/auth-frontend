import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Demo en vivo | PriConPri",
    description:
        "Explorá PriConPri funcionando con datos de ejemplo: productos, add-ons y paneles administrativos reales.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
