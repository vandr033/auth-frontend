"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { CalendarDays, CheckCircle2, Eye, XCircle } from "lucide-react";
import { AdminBooking } from "@/types/admin-booking";
import { useI18n } from "@/lib/i18n";
import { getDateLocale } from "@/lib/date-locale";
import { getBookingDisplayStatus } from "../lib/bookingStatus";
import { formatCurrencyFromCents } from "@/lib/currency";
import { ActionMenu, DataTable, EmptyState, StatusBadge } from "@/components/admin/shared";

interface BookingListViewProps {
    bookings: AdminBooking[];
    currency?: string | null;
    onBookingClick: (booking: AdminBooking) => void;
    onStatusUpdate: (id: number, status: AdminBooking["status"]) => Promise<void>;
}

export function BookingListView({ bookings, currency, onBookingClick, onStatusUpdate }: BookingListViewProps) {
    const { t, locale } = useI18n();
    const dateFnsLocale = getDateLocale(locale);
    if (bookings.length === 0) {
        return (
            <EmptyState
                icon={CalendarDays}
                title={t("adminBookings.noBookingsForPeriod")}
                description={t("adminBookings.noBookingsForPeriodHint")}
                className="min-h-[360px]"
            />
        );
    }

    const getStatusBadge = (status: AdminBooking['status']) => {
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
                label={t('adminCustomers.actions')}
                items={[
                    {
                        label: t('adminBookings.details'),
                        icon: <Eye className="h-4 w-4" />,
                        onSelect: () => onBookingClick(booking),
                    },
                    ...(displayStatus === "PENDING"
                        ? [{
                            label: t('adminBookings.confirmBooking'),
                            icon: <CheckCircle2 className="h-4 w-4" />,
                            separatorBefore: true,
                            onSelect: () => void onStatusUpdate(booking.id, "CONFIRMED"),
                        }]
                        : []),
                    ...(displayStatus === "CONFIRMED"
                        ? [{
                            label: t('adminBookings.markCompleted'),
                            icon: <CheckCircle2 className="h-4 w-4" />,
                            separatorBefore: true,
                            onSelect: () => void onStatusUpdate(booking.id, "COMPLETED"),
                        }]
                        : []),
                    ...(displayStatus === "PENDING" || displayStatus === "CONFIRMED"
                        ? [{
                            label: t('adminBookings.cancelBooking'),
                            icon: <XCircle className="h-4 w-4" />,
                            destructive: true,
                            separatorBefore: displayStatus === "PENDING" ? false : true,
                            onSelect: () => void onStatusUpdate(booking.id, "CANCELLED"),
                        }]
                        : []),
                ]}
            />
        );
    };

    return (
        <DataTable
            mobileBreakpoint="md"
            mobileList={
                <div className="grid gap-3">
                    {bookings.map((booking) => {
                        const displayStatus = getBookingDisplayStatus(booking);
                        const serviceSummary = booking.services.map((service) => service.name).join(", ");
                        return (
                            <div
                                key={booking.id}
                                className="rounded-lg border border-admin-border bg-admin-surface p-4 shadow-sm transition hover:border-admin-border-strong"
                                onClick={() => onBookingClick(booking)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-950">
                                            {format(parseISO(booking.start_at), "PPP", { locale: dateFnsLocale })}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} - {format(parseISO(booking.end_at), "h:mm a", { locale: dateFnsLocale })}
                                        </p>
                                    </div>
                                    <div onClick={(event) => event.stopPropagation()}>
                                        {bookingActions(booking)}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {getStatusBadge(displayStatus)}
                                    <StatusBadge tone="neutral">
                                        {formatCurrencyFromCents(booking.total_price, currency)}
                                    </StatusBadge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminBookings.client')}</p>
                                        <p className="font-medium text-slate-900">{booking.customer.full_name}</p>
                                        <p className="text-xs text-slate-500">{booking.customer.phone || booking.customer.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminBookings.staff')}</p>
                                        <p className="text-slate-700">{booking.staff.name}</p>
                                    </div>
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{serviceSummary}</p>
                            </div>
                        );
                    })}
                </div>
            }
        >
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('shopBooking.dateAndTime')}</TableHead>
                        <TableHead>{t('adminBookings.client')}</TableHead>
                        <TableHead>{t('adminBookings.service')}</TableHead>
                        <TableHead>{t('adminBookings.staff')}</TableHead>
                        <TableHead>{t('adminBookings.status')}</TableHead>
                        <TableHead className="text-right">{t('adminServices.price')}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.map((booking) => {
                        const displayStatus = getBookingDisplayStatus(booking);

                        return (
                        <TableRow
                            key={booking.id}
                            className="cursor-pointer hover:bg-page/50"
                            onClick={() => onBookingClick(booking)}
                        >
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{format(parseISO(booking.start_at), "PPP", { locale: dateFnsLocale })}</span>
                                    <span className="text-xs text-text-muted">
                                        {format(parseISO(booking.start_at), "h:mm a", { locale: dateFnsLocale })} - {format(parseISO(booking.end_at), "h:mm a", { locale: dateFnsLocale })}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{booking.customer.full_name}</span>
                                    <span className="text-xs text-text-muted">{booking.customer.phone || booking.customer.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {booking.services.map(s => (
                                        <span key={s.id} className="text-sm">{s.name}</span>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>{booking.staff.name}</TableCell>
                            <TableCell>{getStatusBadge(displayStatus)}</TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrencyFromCents(booking.total_price, currency)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                {bookingActions(booking)}
                            </TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </DataTable>
    );
}
