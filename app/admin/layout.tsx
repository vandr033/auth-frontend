import { AdminAuthProvider } from "./contexts/AdminAuthContext";

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
