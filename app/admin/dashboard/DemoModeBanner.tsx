"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye } from "lucide-react";
import type { DemoSessionInfo } from "../contexts/AdminAuthContext";
import { completeDemoNavigation } from "@/app/demo/_lib/catalog";

export function DemoModeBanner({ session }: { session: DemoSessionInfo }) {
    const router = useRouter();

    return (
        <aside aria-label="Modo demostración" className="sticky top-0 z-[70] border-b border-admin-border-strong bg-admin-surface px-3 py-2.5 shadow-sm sm:px-5">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-admin-brand-soft text-admin-brand-soft-text">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                            Estás explorando una demo de PriConPri
                            <span className="font-normal text-slate-500"> · {session.profile.displayName} — {session.profile.companyName}</span>
                        </p>
                        <p className="hidden text-xs text-slate-600 sm:block">Los datos son de ejemplo. Las modificaciones y los envíos están deshabilitados.</p>
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {session.profile.key === "completo" && (
                        <label className="sr-only" htmlFor="demo-module-navigation">Explorar otra sección del demo</label>
                    )}
                    {session.profile.key === "completo" && (
                        <select
                            id="demo-module-navigation"
                            defaultValue=""
                            onChange={(event) => {
                                if (event.currentTarget.value) router.push(event.currentTarget.value);
                                event.currentTarget.value = "";
                            }}
                            className="h-9 min-w-36 max-w-full rounded-md border border-admin-border bg-white px-2 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand"
                        >
                            <option value="" disabled>Explorar sección…</option>
                            {completeDemoNavigation.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
                        </select>
                    )}
                    <Link href="/demo" className="inline-flex min-h-9 items-center justify-center rounded-md border border-admin-border bg-white px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-admin-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand">
                        Volver a demos
                    </Link>
                    <Link href="/negocios/crear-cuenta" className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-admin-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-admin-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand focus-visible:ring-offset-2">
                        Quiero PriConPri <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </aside>
    );
}
