import { redirect } from "next/navigation";

export default function LegacyPageManagementPage() {
    redirect("/admin/dashboard/storefront/content");
}
