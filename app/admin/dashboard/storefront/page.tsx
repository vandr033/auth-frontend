import { redirect } from "next/navigation";

import { DEFAULT_STOREFRONT_SECTION } from "@/components/admin/storefront/storefrontSections";

export default function StorefrontPage() {
    redirect(`/admin/dashboard/storefront/${DEFAULT_STOREFRONT_SECTION}`);
}
