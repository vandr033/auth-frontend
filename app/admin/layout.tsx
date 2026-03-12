import type { Metadata } from "next";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

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
    icons: {
        icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AdminAuthProvider>
            <div className="h-[100dvh] overflow-hidden">
                {children}
            </div>
        </AdminAuthProvider>
    );
}
