"use client";

import { useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiveQrScanner } from "@/app/admin/dashboard/group-reservations/components/LiveQrScanner";
import { useI18n } from "@/lib/i18n";
import type { ServicePassScanResult } from "@/app/admin/lib/adminApi";

interface ServicePassCheckInPanelProps {
    onCheckIn: (input: { reservation_code?: string; qr_token?: string }) => Promise<ServicePassScanResult>;
}

export function ServicePassCheckInPanel({ onCheckIn }: ServicePassCheckInPanelProps) {
    const { t } = useI18n();
    const [scanCode, setScanCode] = useState("");
    const [scanBusy, setScanBusy] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<ServicePassScanResult | null>(null);

    const submitScan = async (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        setScanBusy(true);
        setScanError(null);
        try {
            setScanResult(await onCheckIn(trimmed.startsWith("gr1.") ? { qr_token: trimmed } : { reservation_code: trimmed }));
            setScanCode("");
        } catch (error) {
            setScanError(error instanceof Error ? error.message : t("adminPasses.invalid"));
        } finally {
            setScanBusy(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-4 w-4" />{t("adminPasses.scan")}</CardTitle>
                <p className="text-sm text-text-muted">{t("adminPasses.scanDescription")}</p>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-2">
                <LiveQrScanner
                    onDetected={(value) => void submitScan(value)}
                    disabled={scanBusy}
                    title={t("adminPasses.scan")}
                    subtitle={t("adminPasses.scanDescription")}
                    startLabel={t("adminPasses.scanStart")}
                    stopLabel={t("adminPasses.scanStop")}
                    unsupportedLabel={t("adminPasses.scanUnsupported")}
                    unavailableLabel={t("adminPasses.scanUnavailable")}
                    idleLabel={t("adminPasses.scanIdle")}
                />
                <div className="space-y-3">
                    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void submitScan(scanCode); }}>
                        <Input value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder={t("adminPasses.codePlaceholder")} />
                        <Button type="submit" disabled={scanBusy || !scanCode.trim()}>{scanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminPasses.checkCode")}</Button>
                    </form>
                    {scanError ? <p role="alert" className="text-sm text-red-700">{scanError}</p> : null}
                    {scanResult ? (
                        <div className={`rounded-lg border p-4 ${scanResult.scan_status === "VALID" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                            <p className="font-semibold">{scanResult.scan_status === "VALID" ? t("adminPasses.valid") : t("adminPasses.invalid")}</p>
                            {scanResult.reservation ? <p className="mt-1 text-sm">{scanResult.reservation.customer_name} · {scanResult.reservation.offering.title} · {scanResult.reservation.reservation_code}</p> : null}
                            {scanResult.reason ? <p className="mt-1 text-xs text-text-muted">{scanResult.reason}</p> : null}
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}
