"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { resolveApiUrl } from "@/lib/api-url";
import { requestDemoLaunch } from "@/app/demo/_lib/launch";
import { getDemoActionLabel, type DemoOperation, type DemoProfileKey } from "@/app/demo/_lib/catalog";

export type PublicDemoProfile = {
    key: DemoProfileKey;
    displayName: string;
    companyName: string;
    adminDestination: string;
};

export function usePublicDemoProfile(slug: string) {
    const [profile, setProfile] = useState<PublicDemoProfile | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        setReady(false);
        setProfile(null);
        fetch(resolveApiUrl(`/demo/public/${encodeURIComponent(slug)}`), { cache: "no-store" })
            .then(async (response) => {
                if (response.status === 404) return null;
                if (!response.ok) throw new Error("Demo status lookup failed");
                return response.json();
            })
            .then((payload) => { if (active) { setProfile(payload?.data ?? null); setReady(true); } })
            .catch(() => { if (active) setReady(false); });
        return () => { active = false; };
    }, [slug]);

    return { profile, ready };
}

export function DemoFinalSubmitDialog({
    open,
    onOpenChange,
    profile,
    operation,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profile: PublicDemoProfile | null;
    operation: DemoOperation;
}) {
    const [openingAdmin, setOpeningAdmin] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function openAdmin() {
        if (!profile) return;
        setOpeningAdmin(true);
        setError(null);
        try {
            const destination = await requestDemoLaunch(
                profile.key,
                profile.adminDestination,
                (input, init) => fetch(resolveApiUrl(input.toString()), init),
            );
            window.location.assign(destination);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No pudimos abrir el panel demo.");
            setOpeningAdmin(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Esta es una demo de PriConPri</DialogTitle>
                    <DialogDescription>
                        Ya viste el flujo completo. En un negocio real, al confirmar aquí se completaría {getDemoActionLabel(operation)} y recibirías la confirmación. No se guardó ningún cambio.
                    </DialogDescription>
                </DialogHeader>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Seguir explorando</Button>
                    <Button type="button" disabled={!profile || openingAdmin} onClick={() => void openAdmin()}>
                        {openingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ver cómo aparece en el panel <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
