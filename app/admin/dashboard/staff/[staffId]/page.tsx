import { notFound } from "next/navigation";

import { StaffProfileSurface } from "../components/staff-surfaces";

export default async function StaffProfilePage({
    params,
}: {
    params: Promise<{ staffId: string }>;
}) {
    const { staffId } = await params;
    const parsedStaffId = Number(staffId);

    if (!Number.isInteger(parsedStaffId) || parsedStaffId <= 0) {
        notFound();
    }

    return <StaffProfileSurface staffId={parsedStaffId} />;
}
