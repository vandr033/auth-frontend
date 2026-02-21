"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Scissors, DollarSign, Phone, Mail } from "lucide-react";
import { AdminBooking } from "@/types/admin-booking";

interface BookingDetailSheetProps {
    booking: AdminBooking | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (id: number, status: AdminBooking['status']) => Promise<void>;
}

export function BookingDetailSheet({ booking, isOpen, onClose, onStatusUpdate }: BookingDetailSheetProps) {
    if (!booking) return null;

    const ActionButtons = () => {
        if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
            return null;
        }

        return (
            <div className="flex flex-col gap-2 w-full mt-6">
                {booking.status === 'PENDING' && (
                    <Button
                        onClick={() => onStatusUpdate(booking.id, 'CONFIRMED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                    >
                        Confirm Booking
                    </Button>
                )}

                {booking.status === 'CONFIRMED' && (
                    <Button
                        onClick={() => onStatusUpdate(booking.id, 'COMPLETED')}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    >
                        Mark as Completed
                    </Button>
                )}

                <Button
                    variant="outline"
                    onClick={() => onStatusUpdate(booking.id, 'CANCELLED')}
                    className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                    Cancel Booking
                </Button>
            </div>
        );
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="overflow-y-auto sm:max-w-md w-full">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="uppercase tracking-wider">
                            #{booking.id}
                        </Badge>
                        <Badge className={
                            booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                                booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                    booking.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' :
                                        'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }>
                            {booking.status}
                        </Badge>
                    </div>
                    <SheetTitle>Booking Details</SheetTitle>
                    <SheetDescription>
                        Created on {format(parseISO(booking.start_at), "MMM d, yyyy")}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Time & Staff */}
                    <div className="grid gap-4 p-4 rounded-lg bg-surface border border-surface-border">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">Date</p>
                                <p className="text-sm text-text-muted">
                                    {format(parseISO(booking.start_at), "EEEE, MMMM d, yyyy")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">Time</p>
                                <p className="text-sm text-text-muted">
                                    {format(parseISO(booking.start_at), "h:mm a")} - {format(parseISO(booking.end_at), "h:mm a")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-text-muted" />
                            <div>
                                <p className="text-sm font-medium">Staff Member</p>
                                <p className="text-sm text-text-muted">{booking.staff.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Customer Information</h3>
                        <div className="grid gap-3 p-4 rounded-lg bg-page">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-muted">Name</span>
                                <span className="text-sm font-medium">{booking.customer.full_name}</span>
                            </div>
                            {booking.customer.phone && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-muted flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> Phone
                                    </span>
                                    <span className="text-sm">{booking.customer.phone}</span>
                                </div>
                            )}
                            {booking.customer.email && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-muted flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> Email
                                    </span>
                                    <span className="text-sm">{booking.customer.email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Services and Price */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Services</h3>
                        <div className="border border-surface-border rounded-lg divide-y divide-surface-border">
                            {booking.services.map((service) => (
                                <div key={service.id} className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Scissors className="h-4 w-4 text-text-muted" />
                                        <span className="text-sm font-medium">{service.name}</span>
                                    </div>
                                    <span className="text-sm text-text-muted">{service.duration}m</span>
                                </div>
                            ))}
                            <div className="p-3 bg-page flex items-center justify-between font-semibold">
                                <span className="text-sm">Total Price</span>
                                <span className="flex items-center">
                                    <DollarSign className="h-4 w-4" />
                                    {(booking.total_price / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Payment Information</h3>
                        <div className="grid gap-3 p-4 rounded-lg bg-page">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-text-muted">Method</span>
                                <Badge variant="outline">
                                    {booking.payment_method == 'QR' ? 'QR Code' :
                                        booking.payment_method === 'CASH' ? 'Cash' : 'Not Specified'}
                                </Badge>
                            </div>
                            {booking.payment_method === 'QR' && booking.qr_proof_image_url && (
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-text-muted mb-2 text-left">Payment Proof</p>
                                    <a
                                        href={booking.qr_proof_image_url.startsWith('http') ? booking.qr_proof_image_url : `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${booking.qr_proof_image_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block relative rounded-lg overflow-hidden border border-slate-200 hover:ring-2 ring-brand/50 transition-all group"
                                    >
                                        <img
                                            src={booking.qr_proof_image_url.startsWith('http') ? booking.qr_proof_image_url : `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${booking.qr_proof_image_url}`}
                                            alt="Payment Proof"
                                            className="h-32 w-auto object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-medium">Click to Open</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                            {booking.payment_method === 'QR' && !booking.qr_proof_image_url && (
                                <div className="p-2 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">
                                    No payment proof uploaded.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <ActionButtons />
                </div>
            </SheetContent>
        </Sheet>
    );
}
