"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BusinessNavbar } from "@/app/components/business-navbar";
import { NegociosFooter } from "@/components/negocios/NegociosFooter";
import { NegociosHeader } from "@/components/negocios/NegociosHeader";

export default function NegociosLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isNegociosLanding = pathname === "/negocios";

  return (
    <div className="min-h-screen bg-biz-surface">
      {isNegociosLanding ? <NegociosHeader /> : <BusinessNavbar />}
      {children}
      {isNegociosLanding ? <NegociosFooter /> : null}
    </div>
  );
}
