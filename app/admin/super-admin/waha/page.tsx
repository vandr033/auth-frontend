"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AlertTriangle,
    Loader2,
    LogOut,
    QrCode,
    RefreshCcw,
    RotateCcw,
    ShieldCheck,
    Smartphone,
    SquareArrowOutUpRight,
} from "lucide-react";

import {
    getSuperAdminWahaQr,
    getSuperAdminWahaStatus,
    logoutSuperAdminWahaSession,
    restartSuperAdminWahaSession,
    startSuperAdminWahaSession,
    type SuperAdminWahaState,
    type SuperAdminWahaStatus,
} from "@/app/admin/lib/adminApi";
import {
    AdminPageHeader,
    AdminPageShell,
    ConfirmDialog,
    ErrorBanner,
    LoadingSkeleton,
    StatusBadge,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";

const DISCONNECTED_POLL_MS = 12_000;

function readRecordValue(record: Record<string, unknown> | null | undefined, key: string): string | null {
    const value = record?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function formatLastChecked(value: string | null | undefined) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function getStatusTone(status: SuperAdminWahaStatus) {
    if (status === "CONNECTED") return "success" as const;
    if (status === "QR") return "warning" as const;
    if (status === "STARTING") return "info" as const;
    if (status === "ERROR") return "danger" as const;
    return "neutral" as const;
}

function getStatusLabel(status: SuperAdminWahaStatus, t: ReturnType<typeof useT>) {
    if (status === "CONNECTED") return t("superAdminWaha.statusConnected");
    if (status === "QR") return t("superAdminWaha.statusQr");
    if (status === "STARTING") return t("superAdminWaha.statusStarting");
    if (status === "ERROR") return t("superAdminWaha.statusError");
    return t("superAdminWaha.statusDisconnected");
}

function isImageQr(state: SuperAdminWahaState | null) {
    return Boolean(
        state?.qr &&
        typeof state.qr === "string" &&
        (state.qr.startsWith("data:image/") || /^https?:\/\//i.test(state.qr)),
    );
}

export default function SuperAdminWahaPage() {
    const t = useT();
    const stateRef = useRef<SuperAdminWahaState | null>(null);

    const [state, setState] = useState<SuperAdminWahaState | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshingStatus, setRefreshingStatus] = useState(false);
    const [loadingQr, setLoadingQr] = useState(false);
    const [runningAction, setRunningAction] = useState<"start" | "restart" | "logout" | null>(null);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const refreshQr = useCallback(async (options?: { notifyOnError?: boolean }) => {
        setLoadingQr(true);

        try {
            setErrorMessage(null);
            const nextState = await getSuperAdminWahaQr();
            setState(nextState);
            stateRef.current = nextState;
        } catch (error) {
            const message = error instanceof Error ? error.message : t("superAdminWaha.qrLoadFailed");
            setErrorMessage(message);
            if (options?.notifyOnError !== false) {
                await notify.error(message);
            }
        } finally {
            setLoadingQr(false);
        }
    }, [t]);

    const refreshStatus = useCallback(async (options?: { initial?: boolean; forceQr?: boolean; silent?: boolean }) => {
        if (options?.initial) {
            setLoading(true);
        } else {
            setRefreshingStatus(true);
        }

        try {
            setErrorMessage(null);
            const nextState = await getSuperAdminWahaStatus();
            const previousState = stateRef.current;
            const preservedQr =
                nextState.needsQr && previousState?.qr && !options?.forceQr
                    ? { qr: previousState.qr, qrFormat: previousState.qrFormat ?? null }
                    : {};
            const mergedState = {
                ...nextState,
                ...preservedQr,
            };

            setState(mergedState);
            stateRef.current = mergedState;

            const shouldLoadQr =
                nextState.needsQr &&
                (options?.forceQr ||
                    !previousState?.qr ||
                    previousState.status !== nextState.status ||
                    previousState.session !== nextState.session);

            if (shouldLoadQr) {
                await refreshQr({ notifyOnError: !options?.silent });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : t("superAdminWaha.statusLoadFailed");
            setErrorMessage(message);
            if (!options?.silent) {
                await notify.error(message);
            }
        } finally {
            setLoading(false);
            setRefreshingStatus(false);
        }
    }, [refreshQr, t]);

    const runAction = useCallback(async (
        action: "start" | "restart" | "logout",
        handler: () => Promise<SuperAdminWahaState>,
        successMessage: string,
    ) => {
        setRunningAction(action);

        try {
            setErrorMessage(null);
            const nextState = await handler();
            setState(nextState);
            stateRef.current = nextState;

            await notify.success(successMessage);

            if (nextState.needsQr && !nextState.qr) {
                await refreshQr({ notifyOnError: false });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : t("superAdminWaha.actionFailed");
            setErrorMessage(message);
            await notify.error(message);
        } finally {
            setRunningAction(null);
        }
    }, [refreshQr, t]);

    useEffect(() => {
        void refreshStatus({ initial: true, forceQr: true, silent: true });
    }, [refreshStatus]);

    useEffect(() => {
        if (!state || state.isConnected) return;

        const timer = window.setTimeout(() => {
            void refreshStatus({ silent: true });
        }, DISCONNECTED_POLL_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [refreshStatus, state]);

    if (loading) {
        return <LoadingSkeleton variant="page" rows={4} />;
    }

    if (!state) {
        return (
            <AdminPageShell>
                <AdminPageHeader
                    title={t("superAdminWaha.title")}
                    subtitle={t("superAdminWaha.subtitle")}
                    eyebrow={t("adminNav.superAdmin")}
                />
                <ErrorBanner
                    title={t("superAdminWaha.statusLoadFailed")}
                    description={errorMessage || t("superAdminWaha.actionFailed")}
                    action={
                        <Button type="button" variant="outline" onClick={() => void refreshStatus({ forceQr: true })}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            {t("superAdminWaha.refreshStatus")}
                        </Button>
                    }
                />
            </AdminPageShell>
        );
    }

    const accountName =
        readRecordValue(state.account, "pushName") ||
        readRecordValue(state.account, "id") ||
        readRecordValue(state.account, "jid") ||
        t("superAdminWaha.notAvailable");
    const canShowQr = state.needsQr && Boolean(state.sessionExists);
    const showStartButton = !state.sessionExists || state.status === "DISCONNECTED";
    const showRestartButton = state.sessionExists;
    const showLogoutButton = state.sessionExists && (state.isConnected || state.status === "QR" || state.status === "STARTING");
    const qrIsImage = isImageQr(state);
    const isBusy = runningAction !== null;

    return (
        <AdminPageShell>
            <AdminPageHeader
                title={t("superAdminWaha.title")}
                subtitle={t("superAdminWaha.subtitle")}
                eyebrow={t("adminNav.superAdmin")}
                actions={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void refreshStatus({ forceQr: false })}
                            disabled={refreshingStatus || loadingQr || isBusy}
                        >
                            {refreshingStatus ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="mr-2 h-4 w-4" />
                            )}
                            {refreshingStatus
                                ? t("superAdminWaha.refreshingStatus")
                                : t("superAdminWaha.refreshStatus")}
                        </Button>
                        {showStartButton ? (
                            <Button
                                type="button"
                                onClick={() =>
                                    void runAction(
                                        "start",
                                        startSuperAdminWahaSession,
                                        t("superAdminWaha.startSuccess"),
                                    )
                                }
                                disabled={isBusy || refreshingStatus}
                            >
                                {runningAction === "start" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                                )}
                                {runningAction === "start"
                                    ? t("superAdminWaha.startingSession")
                                    : t("superAdminWaha.startSession")}
                            </Button>
                        ) : null}
                        {showRestartButton ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    void runAction(
                                        "restart",
                                        restartSuperAdminWahaSession,
                                        t("superAdminWaha.restartSuccess"),
                                    )
                                }
                                disabled={isBusy || refreshingStatus}
                            >
                                {runningAction === "restart" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                )}
                                {runningAction === "restart"
                                    ? t("superAdminWaha.restartingSession")
                                    : t("superAdminWaha.restartSession")}
                            </Button>
                        ) : null}
                        {showLogoutButton ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setLogoutOpen(true)}
                                disabled={isBusy || refreshingStatus}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                {t("superAdminWaha.logoutSession")}
                            </Button>
                        ) : null}
                    </>
                }
            />

            {errorMessage ? (
                <ErrorBanner
                    title={t("superAdminWaha.actionFailed")}
                    description={errorMessage}
                />
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
                <Card className="border-slate-200">
                    <CardHeader className="pb-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Smartphone className="h-4 w-4 text-emerald-600" />
                                    {t("superAdminWaha.cardTitle")}
                                </CardTitle>
                                <CardDescription>{t("superAdminWaha.cardDescription")}</CardDescription>
                            </div>
                            <StatusBadge tone={getStatusTone(state.status)} dot>
                                {getStatusLabel(state.status, t)}
                            </StatusBadge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {t("superAdminWaha.sessionLabel")}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-950">{state.session}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {t("superAdminWaha.accountLabel")}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-950">{accountName}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    {t("superAdminWaha.lastCheckedLabel")}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-950">
                                    {formatLastChecked(state.lastCheckedAt)}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-950">{state.message}</p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {state.upstreamStatus
                                            ? `${t("superAdminWaha.upstreamLabel")}: ${state.upstreamStatus}`
                                            : t("superAdminWaha.noUpstreamStatus")}
                                    </p>
                                </div>
                                {canShowQr ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void refreshQr()}
                                        disabled={loadingQr || isBusy}
                                    >
                                        {loadingQr ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <QrCode className="mr-2 h-4 w-4" />
                                        )}
                                        {loadingQr
                                            ? t("superAdminWaha.refreshingQr")
                                            : t("superAdminWaha.refreshQr")}
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {canShowQr ? (
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-emerald-950">
                                                {t("superAdminWaha.scanHelperTitle")}
                                            </p>
                                            <p className="mt-1 text-sm text-emerald-900/80">
                                                {t("superAdminWaha.scanHelperDescription")}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                                                WAHA QR
                                            </p>
                                            <p className="text-sm text-white/75">{t("superAdminWaha.qrPanelHint")}</p>
                                        </div>
                                        <QrCode className="h-5 w-5 text-emerald-300" />
                                    </div>

                                    <div className="flex min-h-[280px] items-center justify-center rounded-[1.25rem] bg-white p-4">
                                        {loadingQr ? (
                                            <div className="flex flex-col items-center gap-3 text-slate-500">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                                <p className="text-sm">{t("superAdminWaha.qrLoading")}</p>
                                            </div>
                                        ) : qrIsImage ? (
                                            <Image
                                                src={state.qr ?? ""}
                                                alt={t("superAdminWaha.qrAlt")}
                                                width={260}
                                                height={260}
                                                unoptimized
                                                className="h-auto w-full max-w-[260px] rounded-2xl"
                                            />
                                        ) : state.qr ? (
                                            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-slate-900">
                                                <p className="text-sm font-semibold text-amber-950">
                                                    {t("superAdminWaha.rawQrTitle")}
                                                </p>
                                                <p className="mt-1 text-xs text-amber-900/75">
                                                    {t("superAdminWaha.rawQrDescription")}
                                                </p>
                                                <code className="mt-3 block break-all rounded-xl bg-white p-3 text-xs text-slate-700">
                                                    {state.qr}
                                                </code>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-center text-slate-500">
                                                <AlertTriangle className="h-6 w-6" />
                                                <p className="max-w-[18rem] text-sm">{t("superAdminWaha.qrMissing")}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base">{t("superAdminWaha.detailsTitle")}</CardTitle>
                        <CardDescription>{t("superAdminWaha.detailsDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t("superAdminWaha.accountLabel")}
                            </p>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                                <p>{readRecordValue(state.account, "pushName") || t("superAdminWaha.notAvailable")}</p>
                                <p>{readRecordValue(state.account, "id") || t("superAdminWaha.notAvailable")}</p>
                                <p>{readRecordValue(state.account, "jid") || t("superAdminWaha.notAvailable")}</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {t("superAdminWaha.connectionNotesTitle")}
                            </p>
                            <div className="mt-3 space-y-3 text-sm text-slate-700">
                                <p>{t("superAdminWaha.connectionNoteOne")}</p>
                                <p>{t("superAdminWaha.connectionNoteTwo")}</p>
                                <p>{t("superAdminWaha.connectionNoteThree")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={logoutOpen}
                onOpenChange={setLogoutOpen}
                title={t("superAdminWaha.logoutConfirmTitle")}
                description={t("superAdminWaha.logoutConfirmDescription")}
                confirmLabel={runningAction === "logout" ? t("superAdminWaha.loggingOutSession") : t("superAdminWaha.logoutSession")}
                variant="destructive"
                loading={runningAction === "logout"}
                onConfirm={async () => {
                    await runAction(
                        "logout",
                        logoutSuperAdminWahaSession,
                        t("superAdminWaha.logoutSuccess"),
                    );
                    setLogoutOpen(false);
                }}
            />
        </AdminPageShell>
    );
}
