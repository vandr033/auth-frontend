"use client";

import { useParams } from "next/navigation";

import { StoreProductEditorPage } from "@/components/admin/store/StoreProductEditorPage";

export default function EditStoreProductPage() {
  const params = useParams<{ productId: string }>();

  return <StoreProductEditorPage productId={params?.productId} />;
}
