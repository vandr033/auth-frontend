"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { resolveApiUrl } from "@/lib/api-url";
import type { DemoProfileKey } from "../_lib/catalog";
import { requestDemoLaunch } from "../_lib/launch";

type Props = {
    profile: DemoProfileKey;
    destination?: string;
    className?: string;
    children: ReactNode;
};

export function DemoLaunchButton({ profile, destination, className, children }: Props) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function launch() {
        setBusy(true);
        setError(null);
        try {
            const adminDestination = await requestDemoLaunch(
                profile,
                destination,
                (input, init) => fetch(resolveApiUrl(input.toString()), init),
            );
            window.location.assign(adminDestination);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No pudimos iniciar la demostración.");
            setBusy(false);
        }
    }

    return (
        <div className="min-w-0">
            <button
                type="button"
                aria-busy={busy}
                data-demo-launch={profile}
                data-demo-destination={destination}
                disabled={busy}
                onClick={() => void launch()}
                className={className ?? "inline-flex min-h-11 w-full items-center justify-center gap-2 bg-biz-cta-primary px-5 py-3 font-bebas text-sm font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-biz-cta-hover disabled:cursor-wait disabled:opacity-70 sm:w-auto"}
            >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
                {!busy && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            </button>
            {error && <p role="alert" className="mt-2 max-w-xs text-sm font-medium text-red-800">{error}</p>}
        </div>
    );
}
