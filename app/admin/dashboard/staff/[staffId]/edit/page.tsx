import { notFound } from "next/navigation";

import { StaffEditorSurface } from "../../components/staff-surfaces";

export default async function EditStaffPage({
    params,
}: {
    params: Promise<{ staffId: string }>;
}) {
    const { staffId } = await params;
    const parsedStaffId = Number(staffId);

    if (!Number.isInteger(parsedStaffId) || parsedStaffId <= 0) {
        notFound();
    }

    return <StaffEditorSurface staffId={parsedStaffId} />;
}
