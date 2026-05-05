"use client";

import * as React from "react";

import { StorePointOfSaleEditorPage } from "@/components/admin/store/StorePointOfSaleEditorPage";

export default function AdminStoreEditPointOfSalePage({
  params,
}: {
  params: Promise<{ pointId: string }>;
}) {
  const { pointId } = React.use(params);

  return <StorePointOfSaleEditorPage pointId={pointId} />;
}
