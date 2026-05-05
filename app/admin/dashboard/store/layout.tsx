"use client";

import { AdminStoreSectionLayout } from "@/components/admin/store/admin-store";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminStoreSectionLayout>{children}</AdminStoreSectionLayout>;
}
