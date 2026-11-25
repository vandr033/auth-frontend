"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Eye, XCircle } from "lucide-react";
import { AdminBooking, BookingStatus } from "@/types/admin-booking";
import type { ServicePassReservation } from "@/app/admin/lib/adminApi";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { getBookingDisplayStatus } from "../lib/bookingStatus";
import { formatCurrencyFromCents } from "@/lib/currency";
import { ActionMenu, DataTable, EmptyState, StatusBadge } from "@/components/admin/shared";
import { getImageUrl } from "@/utils/image-url";

interface BookingListViewProps {
    bookings: AdminBooking[];
    passReservations?: ServicePassReservation[];
    currency?: string | null;
    timezone?: string;
    onBookingClick: (booking: AdminBooking) => void;
    onStatusUpdate: (id: number, status: AdminBooking["status"]) => Promise<void>;
    onPassConfirm?: (id: number) => Promise<void>;
    onPassCancel?: (id: number) => Promise<void>;
}

type ReservationRow =
    | { type: "BOOKING"; id: number; booking: AdminBooking }
    | { type: "PASS"; id: number; reservation: ServicePassReservation };

function selectedDateLabel(value: string, locale: string) {
    const dateKey = value.slice(0, 10);
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

function passValidityLabel(reservation: ServicePassReservation, locale: string, timezone: string) {
    const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: timezone }).format(new Date(value));
    const start = formatDate(reservation.valid_from);
    const end = formatDate(new Date(new Date(reservation.valid_until).getTime() - 1).toISOString());
    return start === end ? start : `${start} – ${end}`;
}

export function BookingListView({
    bookings,
    passReservations = [],
    currency,
    timezone = "UTC",
    onBookingClick,
    onStatusUpdate,
    onPassConfirm,
    onPassCancel,
}: BookingListViewProps) {
    const { t, locale } = useI18n();
    const dateFnsLocale = getDateLocale(locale);
    const rows: ReservationRow[] = [
        ...bookings.map((booking) => ({ type: "BOOKING" as const, id: booking.id, booking })),
        ...passReservations.map((reservation) => ({ type: "PASS" as const, id: reservation.id, reservation })),
    ].sort((left, right) => {
        const leftDate = left.type === "BOOKING" ? left.booking.start_at : left.reservation.selected_date;
        const rightDate = right.type === "BOOKING" ? right.booking.start_at : right.reservation.selected_date;
        return leftDate.localeCompare(rightDate);
    });

    const getStatusBadge = (status: BookingStatus) => {
        const tones = {
            CONFIRMED: "success",
            COMPLETED: "info",
            CANCELLED: "danger",
            NO_SHOW: "neutral",
            PENDING: "warning",
        };
        return (
            <StatusBadge tone={tones[status] as React.ComponentProps<typeof StatusBadge>["tone"]} dot>
                {t(`adminBookings.${status === "NO_SHOW" ? "noShow" : status.toLowerCase()}`)}
            </StatusBadge>
        );
    };

    const bookingActions = (booking: AdminBooking) => {
        const displayStatus = getBookingDisplayStatus(booking);
        return (
            <ActionMenu
                label={t("adminCustomers.actions")}
                items={[
                    { label: t("adminBookings.details"), icon: <Eye className="h-4 w-4" />, onSelect: () => onBookingClick(booking) },
                    ...(displayStatus === "PENDING" ? [{ label: t("adminBookings.confirmBooking"), icon: <CheckCircle2 className="h-4 w-4" />, separatorBefore: true, onSelect: () => void onStatusUpdate(booking.id, "CONFIRMED") }] : []),
                    ...(displayStatus === "CONFIRMED" ? [{ label: t("adminBookings.markCompleted"), icon: <CheckCircle2 className="h-4 w-4" />, separatorBefore: true, onSelect: () => void onStatusUpdate(booking.id, "COMPLETED") }] : []),
                    ...(displayStatus === "PENDING" || displayStatus === "CONFIRMED" ? [{ label: t("adminBookings.cancelBooking"), icon: <XCircle className="h-4 w-4" />, destructive: true, separatorBefore: displayStatus === "PENDING" ? false : true, onSelect: () => void onStatusUpdate(booking.id, "CANCELLED") }] : []),
                ]}
            />
        );
    };

    const passActions = (reservation: ServicePassReservation) => (
        <div className="flex justify-end gap-2">
            {reservation.status === "PENDING" && onPassConfirm ? <Button size="sm" onClick={() => void onPassConfirm(reservation.id)}>{t("adminPasses.confirm")}</Button> : null}
            {(reservation.status === "PENDING" || reservation.status === "CONFIRMED") && onPassCancel ? <Button size="sm" variant="outline" onClick={() => void onPassCancel(reservation.id)}>{t("adminPasses.cancel")}</Button> : null}
        </div>
    );

    if (rows.length === 0) {
        return <EmptyState icon={CalendarDays} title={t("adminBookings.noBookingsForPeriod")} description={t("adminBookings.noBookingsForPeriodHint")} className="min-h-[360px]" />;
    }

    return (
        <DataTable
            mobileBreakpoint="md"
            mobileList={
                <div className="grid gap-3">
                    {rows.map((row) => row.type === "BOOKING" ? (() => {
                        const booking = row.booking;
                        const displayStatus = getBookingDisplayStatus(booking);
                        return (
                            <div key={`booking-${booking.id}`} className="rounded-lg border border-admin-border bg-admin-surface p-4 shadow-sm transition hover:border-admin-border-strong" onClick={() => onBookingClick(booking)}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0"><p className="font-semibold text-slate-950">{format(parseISO(booking.start_at), "PPP", { locale: dateFnsLocale })}</p><p className="text-sm text-slate-500">{format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} - {format(parseISO(booking.end_at), "h:mm a", { locale: dateFnsLocale })}</p></div>
                                    <div onClick={(event) => event.stopPropagation()}>{bookingActions(booking)}</div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">{getStatusBadge(displayStatus)}<StatusBadge tone="neutral">{formatCurrencyFromCents(booking.total_price, currency)}</StatusBadge></div>
                                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminBookings.client")}</p><p className="font-medium text-slate-900">{booking.customer.full_name}</p><p className="text-xs text-slate-500">{booking.customer.phone || booking.customer.email}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("adminBookings.staff")}</p><p className="text-slate-700">{booking.staff.name}</p></div></div>
                                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{booking.services.map((service) => service.name).join(", ")}</p>
                            </div>
                        );
                    })() : (() => {
                        const reservation = row.reservation;
                        return (
                            <div key={`pass-${reservation.id}`} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-950">{selectedDateLabel(reservation.selected_date, locale)}</p><p className="text-sm text-slate-500">{passValidityLabel(reservation, locale, timezone)}</p></div><StatusBadge tone="brand">{reservation.offering.duration === "DAY" ? t("adminPasses.day") : t("adminPasses.month")}</StatusBadge></div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">{getStatusBadge(reservation.status)}<StatusBadge tone="neutral">{formatCurrencyFromCents(reservation.price_cents_snapshot, currency)}</StatusBadge></div>
                                <div className="mt-3 flex items-center gap-3"><img src={getImageUrl(reservation.qr_image_url) || reservation.qr_image_url} alt="" className="h-12 w-12 rounded border bg-white" /><div className="min-w-0"><p className="font-medium text-slate-900">{reservation.customer_name}</p><p className="text-xs text-slate-500">{reservation.customer_phone || reservation.customer_email}</p><p className="font-mono text-xs text-slate-600">{reservation.reservation_code}</p></div></div>
                                <p className="mt-3 text-xs text-slate-500">{reservation.payment_status === "PAID" ? t("adminPasses.paid") : reservation.payment_status === "PENDING_CONFIRMATION" ? t("adminPasses.awaitingPayment") : t("adminPasses.unpaid")}{reservation.qr_proof_image_url ? <> · <a className="font-medium text-brand underline" href={getImageUrl(reservation.qr_proof_image_url) || reservation.qr_proof_image_url} target="_blank" rel="noreferrer">{t("adminPasses.viewProof")}</a></> : null}</p>
                                <div className="mt-3 flex justify-end">{passActions(reservation)}</div>
                            </div>
                        );
                    })())}
                </div>
            }
        >
            <Table>
                <TableHeader><TableRow><TableHead>{t("shopBooking.dateAndTime")}</TableHead><TableHead>{t("adminBookings.client")}</TableHead><TableHead>{t("adminBookings.service")}</TableHead><TableHead>{t("adminBookings.staff")}</TableHead><TableHead>{t("adminBookings.status")}</TableHead><TableHead className="text-right">{t("adminServices.price")}</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                    {rows.map((row) => row.type === "BOOKING" ? (() => {
                        const booking = row.booking;
                        const displayStatus = getBookingDisplayStatus(booking);
                        return (
                            <TableRow key={`booking-${booking.id}`} className="cursor-pointer hover:bg-page/50" onClick={() => onBookingClick(booking)}>
                                <TableCell className="font-medium"><div className="flex flex-col"><span>{format(parseISO(booking.start_at), "PPP", { locale: dateFnsLocale })}</span><span className="text-xs text-text-muted">{format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} - {format(parseISO(booking.end_at), "h:mm a", { locale: dateFnsLocale })}</span></div></TableCell>
                                <TableCell><div className="flex flex-col"><span className="font-medium">{booking.customer.full_name}</span><span className="text-xs text-text-muted">{booking.customer.phone || booking.customer.email}</span></div></TableCell>
                                <TableCell><div className="flex flex-col gap-1">{booking.services.map((service) => <span key={service.id} className="text-sm">{service.name}</span>)}</div></TableCell>
                                <TableCell>{booking.staff.name}</TableCell><TableCell>{getStatusBadge(displayStatus)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrencyFromCents(booking.total_price, currency)}</TableCell>
                                <TableCell onClick={(event) => event.stopPropagation()}>{bookingActions(booking)}</TableCell>
                            </TableRow>
                        );
                    })() : (() => {
                        const reservation = row.reservation;
                        return (
                            <TableRow key={`pass-${reservation.id}`} className="bg-amber-50/30 hover:bg-amber-50/70">
                                <TableCell className="font-medium"><div className="flex flex-col"><span>{selectedDateLabel(reservation.selected_date, locale)}</span><span className="text-xs text-text-muted">{passValidityLabel(reservation, locale, timezone)}</span></div></TableCell>
                                <TableCell><div className="flex flex-col"><span className="font-medium">{reservation.customer_name}</span><span className="text-xs text-text-muted">{reservation.customer_phone || reservation.customer_email}</span><span className="mt-0.5 text-xs text-text-muted">{reservation.payment_status === "PAID" ? t("adminPasses.paid") : reservation.payment_status === "PENDING_CONFIRMATION" ? t("adminPasses.awaitingPayment") : t("adminPasses.unpaid")}</span></div></TableCell>
                                <TableCell><div className="flex items-center gap-2"><img src={getImageUrl(reservation.qr_image_url) || reservation.qr_image_url} alt="" className="h-9 w-9 rounded border bg-white" /><div className="flex flex-col gap-0.5"><span className="text-sm font-medium">{reservation.offering.title}</span><span className="text-xs text-text-muted">{reservation.offering.duration === "DAY" ? t("adminPasses.day") : t("adminPasses.month")} · {reservation.reservation_code}</span>{reservation.qr_proof_image_url ? <a className="text-xs font-medium text-brand underline" href={getImageUrl(reservation.qr_proof_image_url) || reservation.qr_proof_image_url} target="_blank" rel="noreferrer">{t("adminPasses.viewProof")}</a> : null}</div></div></TableCell>
                                <TableCell><span className="text-xs text-text-muted">—</span></TableCell>
                                <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrencyFromCents(reservation.price_cents_snapshot, currency)}</TableCell>
                                <TableCell>{passActions(reservation)}</TableCell>
                            </TableRow>
                        );
                    })())}
                </TableBody>
            </Table>
        </DataTable>
    );
}
