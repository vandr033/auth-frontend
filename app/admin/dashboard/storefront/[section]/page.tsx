import { redirect } from "next/navigation";

import StorefrontWorkspace from "@/components/admin/storefront/StorefrontWorkspace";
import {
    DEFAULT_STOREFRONT_SECTION,
    isStorefrontSection,
} from "@/components/admin/storefront/storefrontSections";

export default async function StorefrontSectionPage({
    params,
}: {
    params: Promise<{ section: string }>;
}) {
    const { section } = await params;

    if (!isStorefrontSection(section)) {
        redirect(`/admin/dashboard/storefront/${DEFAULT_STOREFRONT_SECTION}`);
    }

    return <StorefrontWorkspace initialSection={section} />;
}
