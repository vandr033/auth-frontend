import { redirect } from "next/navigation";

export default function LegacyThemePage() {
    redirect("/admin/dashboard/storefront/appearance");
}
