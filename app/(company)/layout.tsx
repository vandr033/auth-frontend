import type { ReactNode } from "react";

import { Navbar } from "@/app/components/navbar";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      {children}
    </div>
  );
}
