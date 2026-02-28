import type { Metadata } from "next";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

export const metadata: Metadata = {
    manifest: "/manifest-admin.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Reservas Admin",
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
            <div className="h-screen overflow-hidden">
                {children}
            </div>
        </AdminAuthProvider>
    );
}
