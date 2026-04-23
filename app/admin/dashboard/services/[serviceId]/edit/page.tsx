"use client";

import { useParams } from "next/navigation";

import { ServiceEditorPage } from "@/app/admin/dashboard/services/components/ServiceEditorPage";

export default function EditServicePage() {
    const params = useParams<{ serviceId: string }>();
    const serviceId = Number.parseInt(params?.serviceId ?? "", 10);
    return <ServiceEditorPage serviceId={serviceId} />;
}
