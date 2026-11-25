import { redirect } from "next/navigation";
import { buildPublicPassBookingPath } from "@/lib/admin/public-links";

export default async function LegacyPassesPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ offering_id?: string | string[] }>;
}) {
    const [{ slug }, { offering_id: offeringId }] = await Promise.all([params, searchParams]);
    redirect(typeof offeringId === "string"
        ? buildPublicPassBookingPath(slug, offeringId)
        : `/shop/${encodeURIComponent(slug)}/services`);
}
