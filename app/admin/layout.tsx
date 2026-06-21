import type { Metadata } from "next";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { PRICONPRI_METADATA_ICONS } from "@/lib/pwa/priconpriIcons";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
    title: "PriConPri Admin",
    manifest: "/manifest-admin.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "PriConPri Admin",
    },
    icons: PRICONPRI_METADATA_ICONS,
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthProvider>
            <div className="min-h-[100svh]">
                {children}
            </div>
        </AdminAuthProvider>
    );
}
