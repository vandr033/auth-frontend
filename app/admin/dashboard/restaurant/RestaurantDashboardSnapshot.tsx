"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRestaurantDashboard, type RestaurantDashboard } from "@/app/admin/lib/adminApi";

export function RestaurantDashboardSnapshot() {
  const [data, setData] = useState<RestaurantDashboard | null>(null);
  useEffect(() => { void getRestaurantDashboard().then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  const items = [["Completadas hoy", data.summary.completed], ["Canceladas hoy", data.summary.cancelled], ["No-show hoy", data.summary.no_shows]];
  return <section className="mx-auto -mt-3 max-w-7xl rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-6">{items.map(([label, value]) => <div key={String(label)}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>)}</div><Button asChild size="sm" variant="outline"><Link href="/admin/dashboard/restaurant/metrics"><BarChart3 className="mr-2 h-4 w-4"/>Ver analítica</Link></Button></div></section>;
}
