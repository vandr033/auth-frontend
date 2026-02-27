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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { AdminBooking } from "@/types/admin-booking";
import { useT } from "@/lib/i18n";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookingListViewProps {
    bookings: AdminBooking[];
    onBookingClick: (booking: AdminBooking) => void;
}

export function BookingListView({ bookings, onBookingClick }: BookingListViewProps) {
    const t = useT();
    if (bookings.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-surface-border bg-surface text-center">
                <p className="text-text-muted">{t('adminBookings.noBookingsForPeriod')}</p>
            </div>
        );
    }

    const getStatusBadge = (status: AdminBooking['status']) => {
        const styles = {
            CONFIRMED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
            COMPLETED: "bg-blue-100 text-blue-800 hover:bg-blue-200",
            CANCELLED: "bg-rose-100 text-rose-800 hover:bg-rose-200",
            NO_SHOW: "bg-gray-100 text-gray-800 hover:bg-gray-200",
            PENDING: "bg-amber-100 text-amber-800 hover:bg-amber-200",
        };

        return (
            <Badge variant="outline" className={`border-0 ${styles[status]}`}>
                {status}
            </Badge>
        );
    };

    return (
        <div className="rounded-md border border-surface-border bg-surface">
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
                    {bookings.map((booking) => (
                        <TableRow
                            key={booking.id}
                            className="cursor-pointer hover:bg-page/50"
                            onClick={() => onBookingClick(booking)}
                        >
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{format(parseISO(booking.start_at), "MMM d, yyyy")}</span>
                                    <span className="text-xs text-text-muted">
                                        {format(parseISO(booking.start_at), "h:mm a")} - {format(parseISO(booking.end_at), "h:mm a")}
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
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell className="text-right font-medium">
                                ${(booking.total_price / 100).toFixed(2)}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">{t('header.openMenu')}</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{t('adminCustomers.actions')}</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onBookingClick(booking)}>
                                            {t('adminBookings.details')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-emerald-600">
                                            {t('adminBookings.confirmBooking')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-rose-600">
                                            {t('adminBookings.cancelBooking')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
