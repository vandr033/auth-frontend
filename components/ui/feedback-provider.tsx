"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    subscribeToFeedback,
    type FeedbackConfirmRequest,
    type FeedbackToastEvent,
} from "@/lib/notify";

const toastToneClasses: Record<FeedbackToastEvent["tone"], string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    error: "border-rose-200 bg-rose-50 text-rose-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    info: "border-sky-200 bg-sky-50 text-sky-950",
};

const toastIcons: Record<FeedbackToastEvent["tone"], ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    error: <XCircle className="h-5 w-5 text-rose-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <Info className="h-5 w-5 text-sky-600" />,
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<FeedbackToastEvent[]>([]);
    const [confirmRequest, setConfirmRequest] = useState<FeedbackConfirmRequest | null>(null);
    const [confirming, setConfirming] = useState(false);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const unsubscribe = subscribeToFeedback((event) => {
            if (event.type === "toast") {
                setToasts((current) => [event.toast, ...current].slice(0, 4));
                const timer = setTimeout(
                    () => setToasts((current) => current.filter((toast) => toast.id !== event.toast.id)),
                    event.toast.tone === "error" ? 5200 : 3600,
                );
                timers.current.set(event.toast.id, timer);
                return;
            }

            setConfirming(false);
            setConfirmRequest(event.request);
        });

        return () => {
            unsubscribe();
            timers.current.forEach((timer) => clearTimeout(timer));
            timers.current.clear();
        };
    }, []);

    const confirmLabels = useMemo(
        () => ({
            confirm: confirmRequest?.confirmButtonText ?? "Confirmar",
            cancel: confirmRequest?.cancelButtonText ?? "Cancelar",
        }),
        [confirmRequest],
    );

    const dismissToast = (id: string) => {
        const timer = timers.current.get(id);
        if (timer) clearTimeout(timer);
        timers.current.delete(id);
        setToasts((current) => current.filter((toast) => toast.id !== id));
    };

    const closeConfirm = (isConfirmed: boolean) => {
        const request = confirmRequest;
        if (!request) return;
        if (isConfirmed) setConfirming(true);
        request.resolve({ isConfirmed });
        setConfirming(false);
        setConfirmRequest(null);
    };

    return (
        <>
            {children}
            <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-5 sm:top-5">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg",
                            toastToneClasses[toast.tone],
                        )}
                        role={toast.tone === "error" ? "alert" : "status"}
                    >
                        <div className="shrink-0">{toastIcons[toast.tone]}</div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{toast.title}</p>
                            {toast.text ? <p className="mt-1 text-sm opacity-80">{toast.text}</p> : null}
                        </div>
                        <button
                            type="button"
                            className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                            onClick={() => dismissToast(toast.id)}
                            aria-label="Cerrar notificación"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <Dialog
                open={Boolean(confirmRequest)}
                onOpenChange={(open) => {
                    if (!open) closeConfirm(false);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div
                            className={cn(
                                "mb-1 flex h-10 w-10 items-center justify-center rounded-lg",
                                confirmRequest?.variant === "destructive"
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-slate-100 text-slate-700",
                            )}
                        >
                            {confirmRequest?.variant === "destructive" ? (
                                <ShieldAlert className="h-5 w-5" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                        </div>
                        <DialogTitle>{confirmRequest?.title}</DialogTitle>
                        {confirmRequest?.text ? (
                            <DialogDescription>{confirmRequest.text}</DialogDescription>
                        ) : null}
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={confirming} onClick={() => closeConfirm(false)}>
                            {confirmLabels.cancel}
                        </Button>
                        <Button
                            type="button"
                            variant={confirmRequest?.variant === "destructive" ? "destructive" : "default"}
                            disabled={confirming}
                            onClick={() => closeConfirm(true)}
                        >
                            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {confirmLabels.confirm}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
