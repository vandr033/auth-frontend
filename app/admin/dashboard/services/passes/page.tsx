import { redirect } from "next/navigation";

export default function LegacyServicePassesPage() {
    redirect("/admin/dashboard/services");
}
