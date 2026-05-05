"use client";

import { useParams } from "next/navigation";

import { StoreComboEditorPage } from "@/components/admin/store/StoreComboEditorPage";

export default function EditStoreComboPage() {
  const params = useParams<{ comboId: string }>();

  return <StoreComboEditorPage comboId={params?.comboId} />;
}
