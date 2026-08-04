import { AdminAuthProvider } from "@/app/admin/contexts/AdminAuthContext";

export default function RestaurantStaffLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
