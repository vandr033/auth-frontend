"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Link2, Loader2, RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { PlanUpgradeNotice } from "@/components/admin/plan/PlanUpgradeNotice";
import { useGroupReservationsAccess } from "../lib/useGroupReservationsAccess";
import { GroupTicketStatusBadge } from "../components/GroupBadges";
import { LiveQrScanner } from "../components/LiveQrScanner";
import { formatDateTime } from "../lib/format";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";
import {
    checkInGroupByTicketCode,
    cancelGroupTicket,
    getGroupAttendanceSummary,
    listGroupClassEnrollments,
    listGroupClassSessionAttendance,
    listGroupClassSessions,
    listGroupClasses,
    listGroupEvents,
    listGroupTickets,
    resendGroupTicket,
    rotateGroupClassSessionPublicAttendance,
    setGroupClassSessionAttendanceStatus,
    updateGroupClassSessionPublicAttendance,
    type GroupAttendanceRow,
    type GroupAttendanceSummary,
    type GroupClass,
    type GroupClassEnrollment,
    type GroupClassSession,
    type GroupEvent,
    type GroupTicket,
} from "@/app/admin/lib/adminApi";

type ScanResultKind = "valid" | "already_used" | "invalid";

type ScanResultState = {
    status: ScanResultKind;
    message: string;
} | null;
type SessionRosterStatus = "SHOW" | "NO_SHOW" | "UNMARKED";

type SessionPublicAttendanceDraft = {
    public_attendance_enabled: boolean;
    attendance_access_code_enabled: boolean;
    attendance_access_code: string;
    attendance_access_code_configured: boolean;
};

function normalizeScannedTicketValue(rawValue: string): string {
    const trimmed = rawValue.trim();
    if (!trimmed) return "";

    try {
        const url = new URL(trimmed);
        const candidates = ["qr_token", "ticket_code", "ticket", "code", "token"];
        for (const key of candidates) {
            const value = url.searchParams.get(key);
            if (value && value.trim().length > 0) {
                return value.trim();
            }
        }

        const lastSegment = url.pathname.split("/").filter(Boolean).slice(-1)[0];
        if (lastSegment) {
            return decodeURIComponent(lastSegment.trim());
        }
    } catch {
        // Raw value is not a URL; use it directly.
    }

    return trimmed;
}

export default function GroupAttendancePage() {
    const t = useT();
    const searchParams = useSearchParams();
    const { canUseAdvanced, canUseClasses, canUseEvents, getRequiredPlan } = useGroupReservationsAccess();
    const { companyUser } = useAdminAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [summary, setSummary] = useState<GroupAttendanceSummary | null>(null);
    const [events, setEvents] = useState<GroupEvent[]>([]);
    const [classes, setClasses] = useState<GroupClass[]>([]);
    const [sessions, setSessions] = useState<GroupClassSession[]>([]);
    const [tickets, setTickets] = useState<GroupTicket[]>([]);
    const [sessionEnrollments, setSessionEnrollments] = useState<GroupClassEnrollment[]>([]);
    const [sessionAttendanceRows, setSessionAttendanceRows] = useState<GroupAttendanceRow[]>([]);
    const [sessionRosterLoading, setSessionRosterLoading] = useState(false);
    const [sessionPublicAttendanceDraft, setSessionPublicAttendanceDraft] = useState<SessionPublicAttendanceDraft | null>(null);
    const [sessionPublicAttendanceSaving, setSessionPublicAttendanceSaving] = useState(false);
    const [sessionPublicAttendanceRotating, setSessionPublicAttendanceRotating] = useState(false);
    const [sessionPublicAttendanceCopied, setSessionPublicAttendanceCopied] = useState(false);

    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [eventTicketCode, setEventTicketCode] = useState("");
    const [ticketCode, setTicketCode] = useState("");
    const [scanResult, setScanResult] = useState<ScanResultState>(null);
    const preselectedSessionId = searchParams?.get("sessionId") ?? null;
    const preselectedEventId = searchParams?.get("eventId") ?? null;

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [summaryData, eventsData, classesData, ticketsData] = await Promise.all([
                getGroupAttendanceSummary(),
                canUseEvents ? listGroupEvents({ upcoming: true }) : Promise.resolve([] as GroupEvent[]),
                canUseClasses ? listGroupClasses({ status: "PUBLISHED" }) : Promise.resolve([] as GroupClass[]),
                canUseAdvanced ? listGroupTickets() : Promise.resolve([] as GroupTicket[]),
            ]);

            const sessionsByClass = await Promise.all(
                classesData.map((item) => listGroupClassSessions(item.id, { upcoming: true })),
            );
            const sessionRows = sessionsByClass.flat();

            setSummary(summaryData);
            setEvents(eventsData);
            setClasses(classesData);
            setSessions(sessionRows);
            setTickets(ticketsData);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setLoading(false);
        }
    }, [canUseAdvanced, canUseClasses, canUseEvents, t]);

    const loadSessionRoster = useCallback(async (classId: number, sessionId: number) => {
        setSessionRosterLoading(true);
        try {
            const [enrollmentsData, attendanceData] = await Promise.all([
                listGroupClassEnrollments(classId),
                listGroupClassSessionAttendance(sessionId),
            ]);
            setSessionEnrollments(enrollmentsData);
            setSessionAttendanceRows(attendanceData);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.loadError"));
        } finally {
            setSessionRosterLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (!canUseAdvanced) return;
        void loadData();
    }, [canUseAdvanced, loadData]);

    useEffect(() => {
        if (!canUseAdvanced) return;

        if (preselectedSessionId) {
            const session = sessions.find((s) => String(s.id) === preselectedSessionId);
            if (session) {
                setSelectedSessionId((current) => (current ? current : preselectedSessionId));
                setSelectedClassId((current) => (current ? current : String(session.group_class_id)));
            }
        }

        if (preselectedEventId && events.some((event) => String(event.id) === preselectedEventId)) {
            setSelectedEventId((current) => (current ? current : preselectedEventId));
        }
    }, [canUseAdvanced, events, preselectedEventId, preselectedSessionId, sessions]);

    const filteredSessions = selectedClassId
        ? sessions.filter((s) => String(s.group_class_id) === selectedClassId)
        : sessions;

    const selectedSession = sessions.find((s) => String(s.id) === selectedSessionId) ?? null;
    const selectedSessionClass = selectedSession
        ? (classes.find((c) => c.id === selectedSession.group_class_id) ?? null)
        : null;

    useEffect(() => {
        if (!selectedClassId || !selectedSessionId) {
            setSessionEnrollments([]);
            setSessionAttendanceRows([]);
            return;
        }

        void loadSessionRoster(Number.parseInt(selectedClassId, 10), Number.parseInt(selectedSessionId, 10));
    }, [loadSessionRoster, selectedClassId, selectedSessionId]);

    useEffect(() => {
        if (!selectedSession) {
            setSessionPublicAttendanceDraft(null);
            return;
        }

        setSessionPublicAttendanceDraft({
            public_attendance_enabled: selectedSession.public_attendance_enabled,
            attendance_access_code_enabled: selectedSession.attendance_access_code_enabled,
            attendance_access_code: "",
            attendance_access_code_configured: Boolean(selectedSession.attendance_access_code_configured),
        });
        setSessionPublicAttendanceCopied(false);
    }, [selectedSession]);

    const buildPublicAttendanceUrl = useCallback((session: GroupClassSession) => {
        const companySlug = companyUser?.company?.slug;
        if (!companySlug || !session.attendance_public_token) return null;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return `${origin}/shop/${companySlug}/classes/attendance/${session.attendance_public_token}`;
    }, [companyUser?.company?.slug]);

    const replaceSession = useCallback((nextSession: GroupClassSession) => {
        setSessions((current) =>
            current.map((session) => (session.id === nextSession.id ? nextSession : session)),
        );
        if (String(nextSession.id) === selectedSessionId) {
            setSessionPublicAttendanceDraft({
                public_attendance_enabled: nextSession.public_attendance_enabled,
                attendance_access_code_enabled: nextSession.attendance_access_code_enabled,
                attendance_access_code: "",
                attendance_access_code_configured: Boolean(nextSession.attendance_access_code_configured),
            });
        }
    }, [selectedSessionId]);

    const handleEventCheckIn = async () => {
        const normalizedCode = normalizeScannedTicketValue(eventTicketCode);
        if (!selectedEventId || !normalizedCode) {
            await notify.warning(t("adminGroup.attendance.missingEventCheckInData"));
            return;
        }
        setSubmitting(true);
        try {
            const result = await checkInGroupByTicketCode({
                ticket_code: normalizedCode,
                method: "MANUAL",
                event_id: Number.parseInt(selectedEventId, 10),
            });

            const status: ScanResultKind = result.scan_status === "VALID"
                ? "valid"
                : result.scan_status === "ALREADY_USED"
                    ? "already_used"
                    : "invalid";
            const message = status === "valid"
                ? t("adminGroup.attendance.valid")
                : status === "already_used"
                    ? t("adminGroup.attendance.alreadyUsed")
                    : t("adminGroup.attendance.invalid");

            setScanResult({ status, message: result.reason ? `${message} (${result.reason})` : message });
            setEventTicketCode("");
            await loadData();
        } catch (error) {
            const message = error instanceof Error ? error.message : t("adminGroup.attendance.invalid");
            const status: ScanResultKind =
                message.toLowerCase().includes("already") ? "already_used" : "invalid";
            setScanResult({ status, message });
            await notify.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSessionAttendanceStatus = async (userId: string, status: Exclude<SessionRosterStatus, "UNMARKED">) => {
        if (!selectedSessionId || !selectedClassId) {
            await notify.warning(t("adminGroup.attendance.noSessionSelected"));
            return;
        }
        setSubmitting(true);
        try {
            await setGroupClassSessionAttendanceStatus(Number.parseInt(selectedSessionId, 10), {
                user_id: userId,
                status,
                method: "MANUAL",
            });
            await notify.success(
                status === "SHOW"
                    ? t("adminGroup.attendance.markedShow")
                    : t("adminGroup.attendance.markedNoShow"),
            );
            await Promise.all([
                loadData(),
                loadSessionRoster(Number.parseInt(selectedClassId, 10), Number.parseInt(selectedSessionId, 10)),
            ]);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.attendance.updateStatusError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveSessionPublicAttendance = async () => {
        if (!selectedSession || !sessionPublicAttendanceDraft) {
            await notify.warning(t("adminGroup.attendance.noSessionSelected"));
            return;
        }
        if (
            sessionPublicAttendanceDraft.attendance_access_code_enabled
            && !sessionPublicAttendanceDraft.attendance_access_code.trim()
            && !sessionPublicAttendanceDraft.attendance_access_code_configured
        ) {
            await notify.warning("Ingresa un codigo de acceso para activar la proteccion.");
            return;
        }

        setSessionPublicAttendanceSaving(true);
        try {
            const updated = await updateGroupClassSessionPublicAttendance(selectedSession.id, {
                public_attendance_enabled: sessionPublicAttendanceDraft.public_attendance_enabled,
                attendance_access_code_enabled: sessionPublicAttendanceDraft.attendance_access_code_enabled,
                attendance_access_code: sessionPublicAttendanceDraft.attendance_access_code.trim() || null,
            });
            replaceSession(updated);
            await notify.success("Configuracion de asistencia publica guardada.");
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
        } finally {
            setSessionPublicAttendanceSaving(false);
        }
    };

    const handleRotateSessionPublicAttendance = async () => {
        if (!selectedSession) {
            await notify.warning(t("adminGroup.attendance.noSessionSelected"));
            return;
        }
        setSessionPublicAttendanceRotating(true);
        try {
            const updated = await rotateGroupClassSessionPublicAttendance(selectedSession.id);
            replaceSession(updated);
            await notify.success("Link de asistencia rotado.");
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : "No se pudo rotar el link.");
        } finally {
            setSessionPublicAttendanceRotating(false);
        }
    };

    const handleCopySessionPublicAttendance = async () => {
        if (!selectedSession) {
            await notify.warning(t("adminGroup.attendance.noSessionSelected"));
            return;
        }
        const url = buildPublicAttendanceUrl(selectedSession);
        if (!url) {
            await notify.warning("Guarda y habilita el link antes de copiarlo.");
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            setSessionPublicAttendanceCopied(true);
            await notify.success("Link de asistencia copiado.");
            window.setTimeout(() => setSessionPublicAttendanceCopied(false), 2000);
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : "No se pudo copiar el link.");
        }
    };

    const handleTicketScan = async (overrideCode?: string) => {
        const normalizedCode = normalizeScannedTicketValue(overrideCode ?? ticketCode);
        if (!normalizedCode) {
            await notify.warning(t("adminGroup.attendance.ticketRequired"));
            return;
        }

        setSubmitting(true);
        try {
            const result = await checkInGroupByTicketCode({
                ticket_code: normalizedCode,
                method: "QR_SCAN",
                class_session_id: selectedSessionId ? Number.parseInt(selectedSessionId, 10) : undefined,
                event_id: selectedEventId ? Number.parseInt(selectedEventId, 10) : undefined,
            });

            const status: ScanResultKind = result.scan_status === "VALID"
                ? "valid"
                : result.scan_status === "ALREADY_USED"
                    ? "already_used"
                    : "invalid";
            const message = status === "valid"
                ? t("adminGroup.attendance.valid")
                : status === "already_used"
                    ? t("adminGroup.attendance.alreadyUsed")
                    : t("adminGroup.attendance.invalid");

            setScanResult({ status, message: result.reason ? `${message} (${result.reason})` : message });
            setTicketCode(normalizedCode);
            await loadData();
        } catch (error) {
            const message = error instanceof Error ? error.message : t("adminGroup.attendance.invalid");
            const status: ScanResultKind =
                message.toLowerCase().includes("already") ? "already_used" : "invalid";
            setScanResult({ status, message });
            await notify.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLiveCameraDetection = async (rawValue: string) => {
        const normalizedCode = normalizeScannedTicketValue(rawValue);
        if (!normalizedCode) return;
        setTicketCode(normalizedCode);
        await handleTicketScan(normalizedCode);
    };

    const handleResendTicket = async (ticketCodeValue: string) => {
        setSubmitting(true);
        try {
            await resendGroupTicket(ticketCodeValue);
            await notify.success(t("adminGroup.attendance.ticketResentSuccess"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.attendance.ticketResentError"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelTicket = async (ticketCodeValue: string) => {
        setSubmitting(true);
        try {
            await cancelGroupTicket(ticketCodeValue);
            await notify.success(t("adminGroup.attendance.ticketCancelledSuccess"));
            await loadData();
        } catch (error) {
            await notify.error(error instanceof Error ? error.message : t("adminGroup.attendance.ticketCancelledError"));
        } finally {
            setSubmitting(false);
        }
    };

    const latestTickets = useMemo(() => tickets.slice(0, 15), [tickets]);
    const sessionAttendanceByUserId = useMemo(
        () => new Map(sessionAttendanceRows.map((row) => [row.user_id, row])),
        [sessionAttendanceRows],
    );
    const sessionRoster = useMemo(() => {
        if (!selectedSession) return [];

        const sessionStart = new Date(selectedSession.start_at).getTime();

        return sessionEnrollments
            .filter((enrollment) =>
                enrollment.status === "CONFIRMED"
                && enrollment.cancelled_at === null
                && new Date(enrollment.valid_from).getTime() <= sessionStart
                && new Date(enrollment.valid_until).getTime() >= sessionStart,
            )
            .map((enrollment) => {
                const attendance = sessionAttendanceByUserId.get(enrollment.user_id) ?? null;
                const status: SessionRosterStatus = attendance
                    ? attendance.checked_in_at
                        ? "SHOW"
                        : "NO_SHOW"
                    : "UNMARKED";

                return {
                    enrollment,
                    attendance,
                    status,
                };
            })
            .sort((a, b) => {
                const left = a.enrollment.user?.name || a.enrollment.user?.email || a.enrollment.user_id;
                const right = b.enrollment.user?.name || b.enrollment.user?.email || b.enrollment.user_id;
                return left.localeCompare(right);
            });
    }, [selectedSession, sessionAttendanceByUserId, sessionEnrollments]);

    if (!canUseAdvanced) {
        const requiredPlan = getRequiredPlan("GROUP_ADVANCED");
        return (
            <PlanUpgradeNotice
                title={t("planEnforcement.featureLockedTitle")}
                message={requiredPlan === "PRO" ? t("planEnforcement.availableOnPro") : t("planEnforcement.availableOnBusiness")}
                feature="GROUP_ADVANCED"
                requiredPlan={requiredPlan}
                fullPage
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{t("adminGroup.attendance.title")}</h2>
                    <p className="text-sm text-slate-600">{t("adminGroup.attendance.subtitle")}</p>
                </div>
                <Button variant="outline" onClick={() => void loadData()}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {t("adminGroup.actions.refresh")}
                </Button>
            </div>

            {loading || !summary ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-admin-brand" />
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.attendance.totalRows")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{summary.total_rows}</CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.attendance.eventCheckedIn")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{summary.event_checked_in}</CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-600">{t("adminGroup.attendance.classCheckedIn")}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-2xl font-semibold text-slate-900">{summary.class_checked_in}</CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base">{t("adminGroup.attendance.scanByTicket")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <LiveQrScanner
                                    onDetected={handleLiveCameraDetection}
                                    disabled={submitting}
                                    title={t("adminGroup.attendance.liveScannerTitle")}
                                    subtitle={t("adminGroup.attendance.liveScannerSubtitle")}
                                    startLabel={t("adminGroup.attendance.startCamera")}
                                    stopLabel={t("adminGroup.attendance.stopCamera")}
                                    unsupportedLabel={t("adminGroup.attendance.cameraUnsupported")}
                                    unavailableLabel={t("adminGroup.attendance.cameraUnavailable")}
                                    idleLabel={t("adminGroup.attendance.cameraIdle")}
                                />
                                <Label>{t("adminGroup.fields.ticketCode")}</Label>
                                <Input value={ticketCode} onChange={(e) => setTicketCode(e.target.value)} />
                                <Button className="w-full" onClick={() => void handleTicketScan()} disabled={submitting}>
                                    {t("adminGroup.attendance.scan")}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base">{t("adminGroup.attendance.manualEventCheckIn")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Label>{t("adminGroup.fields.event")}</Label>
                                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminGroup.attendance.selectEvent")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {events.map((event) => (
                                            <SelectItem key={event.id} value={String(event.id)}>
                                                {event.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Label>{t("adminGroup.fields.ticketCode")}</Label>
                                <Input
                                    value={eventTicketCode}
                                    placeholder={t("adminGroup.attendance.ticketCodePlaceholder")}
                                    onChange={(e) => setEventTicketCode(e.target.value)}
                                />
                                <Button className="w-full" variant="outline" onClick={() => void handleEventCheckIn()} disabled={submitting}>
                                    {t("adminGroup.attendance.checkIn")}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-base">{t("adminGroup.attendance.manualSessionCheckIn")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Label>{t("adminGroup.fields.class")}</Label>
                                <Select
                                    value={selectedClassId}
                                    onValueChange={(val) => {
                                        setSelectedClassId(val);
                                        setSelectedSessionId("");
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminGroup.attendance.selectClass")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={String(cls.id)}>
                                                {cls.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Label>{t("adminGroup.fields.session")}</Label>
                                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminGroup.attendance.selectSession")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSessions.map((session) => (
                                            <SelectItem key={session.id} value={String(session.id)}>
                                                {formatDateTime(session.start_at)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedSession && (
                                    <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-0.5">
                                        <p><span className="font-medium">{t("adminGroup.fields.class")}:</span> {selectedSessionClass?.title ?? "—"}</p>
                                        <p><span className="font-medium">{t("adminGroup.fields.session")}:</span> {formatDateTime(selectedSession.start_at)}</p>
                                        <p><span className="font-medium">{t("adminGroup.attendance.registeredCount")}:</span> {sessionRoster.length}</p>
                                    </div>
                                )}
                                {selectedSession && sessionPublicAttendanceDraft ? (
                                    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 font-medium ${
                                                sessionPublicAttendanceDraft.public_attendance_enabled
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-200 text-slate-600"
                                            }`}>
                                                <Link2 className="mr-1 h-3 w-3" />
                                                {sessionPublicAttendanceDraft.public_attendance_enabled ? "Link activo" : "Link desactivado"}
                                            </span>
                                            {sessionPublicAttendanceDraft.attendance_access_code_enabled ? (
                                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 font-medium text-amber-700">
                                                    Ingresar codigo de acceso
                                                </span>
                                            ) : null}
                                            {sessionPublicAttendanceDraft.attendance_access_code_configured ? (
                                                <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-1 font-medium text-sky-700">
                                                    Codigo guardado
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className="text-sm text-slate-700">Habilitar link de asistencia</Label>
                                            <Switch
                                                checked={sessionPublicAttendanceDraft.public_attendance_enabled}
                                                onCheckedChange={(checked) =>
                                                    setSessionPublicAttendanceDraft((current) => current ? {
                                                        ...current,
                                                        public_attendance_enabled: checked,
                                                    } : current)
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className="text-sm text-slate-700">Ingresar codigo de acceso</Label>
                                            <Switch
                                                checked={sessionPublicAttendanceDraft.attendance_access_code_enabled}
                                                onCheckedChange={(checked) =>
                                                    setSessionPublicAttendanceDraft((current) => current ? {
                                                        ...current,
                                                        attendance_access_code_enabled: checked,
                                                    } : current)
                                                }
                                            />
                                        </div>
                                        <Input
                                            value={sessionPublicAttendanceDraft.attendance_access_code}
                                            onChange={(e) =>
                                                setSessionPublicAttendanceDraft((current) => current ? {
                                                    ...current,
                                                    attendance_access_code: e.target.value,
                                                } : current)
                                            }
                                            placeholder={
                                                sessionPublicAttendanceDraft.attendance_access_code_configured
                                                    ? "Dejar en blanco para mantener el codigo actual"
                                                    : "Codigo de acceso"
                                            }
                                            disabled={!sessionPublicAttendanceDraft.attendance_access_code_enabled}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleCopySessionPublicAttendance()}
                                                disabled={!selectedSession.attendance_public_token}
                                            >
                                                <Copy className="mr-1 h-3 w-3" />
                                                {sessionPublicAttendanceCopied ? "Copiado" : "Copiar link"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void handleRotateSessionPublicAttendance()}
                                                disabled={sessionPublicAttendanceRotating}
                                            >
                                                {sessionPublicAttendanceRotating ? (
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                ) : (
                                                    <RefreshCcw className="mr-1 h-3 w-3" />
                                                )}
                                                Rotar link
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => void handleSaveSessionPublicAttendance()}
                                                disabled={sessionPublicAttendanceSaving}
                                            >
                                                {sessionPublicAttendanceSaving ? (
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                ) : null}
                                                Guardar
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                                <p className="text-sm text-slate-500">{t("adminGroup.attendance.sessionRosterSubtitle")}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.attendance.sessionRosterTitle")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!selectedSession ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.attendance.noSessionSelected")}</p>
                            ) : sessionRosterLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-admin-brand" />
                                </div>
                            ) : sessionRoster.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.attendance.noRegisteredUsers")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.email")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.phone")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessionRoster.map(({ enrollment, attendance, status }) => (
                                            <TableRow key={enrollment.id}>
                                                <TableCell className="font-medium">
                                                    {enrollment.user?.name || enrollment.user?.email || enrollment.user_id}
                                                </TableCell>
                                                <TableCell>{enrollment.user?.email || "—"}</TableCell>
                                                <TableCell>{enrollment.user?.phoneNumber || "—"}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <span
                                                            className={
                                                                status === "SHOW"
                                                                    ? "text-sm font-medium text-emerald-700"
                                                                    : status === "NO_SHOW"
                                                                        ? "text-sm font-medium text-rose-700"
                                                                        : "text-sm font-medium text-slate-500"
                                                            }
                                                        >
                                                            {status === "SHOW"
                                                                ? t("adminGroup.attendance.statusShow")
                                                                : status === "NO_SHOW"
                                                                    ? t("adminGroup.attendance.statusNoShow")
                                                                    : t("adminGroup.attendance.statusUnmarked")}
                                                        </span>
                                                        {attendance?.checked_in_at ? (
                                                            <p className="text-xs text-slate-500">
                                                                {formatDateTime(attendance.checked_in_at)}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => void handleSessionAttendanceStatus(enrollment.user_id, "SHOW")}
                                                        disabled={submitting}
                                                    >
                                                        {t("adminGroup.attendance.markShow")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => void handleSessionAttendanceStatus(enrollment.user_id, "NO_SHOW")}
                                                        disabled={submitting}
                                                    >
                                                        {t("adminGroup.attendance.markNoShow")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.attendance.scanResult")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!scanResult ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.attendance.scanPlaceholder")}</p>
                            ) : (
                                <p
                                    className={
                                        scanResult.status === "valid"
                                            ? "text-sm font-medium text-emerald-700"
                                            : scanResult.status === "already_used"
                                                ? "text-sm font-medium text-amber-700"
                                                : "text-sm font-medium text-rose-700"
                                    }
                                >
                                    {scanResult.message}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base">{t("adminGroup.ticket.latestTickets")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {latestTickets.length === 0 ? (
                                <p className="text-sm text-slate-500">{t("adminGroup.ticket.none")}</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("adminGroup.fields.ticketCode")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.status")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.validity")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.subject")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.name")}</TableHead>
                                            <TableHead>{t("adminGroup.fields.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {latestTickets.map((ticket) => {
                                            const subject = ticket.event_booking?.group_event?.title
                                                || ticket.class_enrollment?.group_class?.title
                                                || "—";
                                            const customer = ticket.holder_name
                                                || ticket.holder_email
                                                || ticket.holder_phone
                                                || ticket.event_booking?.user?.name
                                                || ticket.event_booking?.user?.email
                                                || ticket.class_enrollment?.user?.name
                                                || ticket.class_enrollment?.user?.email
                                                || "—";
                                            return (
                                                <TableRow key={ticket.id}>
                                                    <TableCell>{ticket.ticket_code}</TableCell>
                                                    <TableCell>
                                                        <GroupTicketStatusBadge status={ticket.status} />
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {formatDateTime(ticket.valid_from)}
                                                        <br />
                                                        {formatDateTime(ticket.valid_until)}
                                                    </TableCell>
                                                    <TableCell>{subject}</TableCell>
                                                    <TableCell>{customer}</TableCell>
                                                    <TableCell className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={submitting || ticket.status === "CANCELLED" || ticket.status === "EXPIRED"}
                                                            onClick={() => void handleResendTicket(ticket.ticket_code)}
                                                        >
                                                            {t("adminGroup.actions.resendTicket")}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={submitting || ticket.status === "CANCELLED"}
                                                            onClick={() => void handleCancelTicket(ticket.ticket_code)}
                                                        >
                                                            {t("adminGroup.actions.cancelTicket")}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
