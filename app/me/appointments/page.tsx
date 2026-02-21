"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useApi } from "@/app/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  AlertTriangle,
  ChevronRight,
  XCircle,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentService = {
  id: number;
  name: string;
  price_cents: number;
  duration_minutes: number;
};

type Appointment = {
  id: number;
  company: {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  staff: {
    id: number;
    display_name: string;
    image_url: string | null;
  } | null;
  services: AppointmentService[];
  start_at: string;
  end_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_price_cents: number;
  notes: string | null;
  isPast: boolean;
  canCancel: boolean;
  canModify: boolean;
  cancelLimitMinutes: number;
  rescheduleLimitMinutes: number;
};

type AppointmentsData = {
  upcoming: Appointment[];
  past: Appointment[];
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  NO_SHOW: "bg-slate-50 text-slate-700 border-slate-200",
};

function AppointmentCard({
  appointment,
  onCancel,
  cancelling,
}: {
  appointment: Appointment;
  onCancel?: (id: number) => void;
  cancelling?: boolean;
}) {
  const startDate = new Date(appointment.start_at);
  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const totalDuration = appointment.services.reduce(
    (sum, s) => sum + s.duration_minutes,
    0,
  );

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: Date pill */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-brand/5 px-4 py-3 text-center shrink-0 min-w-[80px]">
            <span className="text-xs font-medium text-brand uppercase">
              {startDate.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className="text-2xl font-bold text-brand">
              {startDate.getDate()}
            </span>
            <span className="text-xs text-brand/70">
              {startDate.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </div>

          {/* Middle: Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Salon name */}
            <div className="flex items-center gap-2">
              <Link
                href={`/shop/${appointment.company.slug}`}
                className="font-semibold text-slate-900 hover:text-brand transition-colors truncate"
              >
                {appointment.company.name}
              </Link>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  statusColors[appointment.status] || statusColors.PENDING,
                )}
              >
                {appointment.status}
              </span>
            </div>

            {/* Services */}
            <div className="flex flex-wrap gap-1.5">
              {appointment.services.map((s) => (
                <span
                  key={s.id}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {s.name}
                </span>
              ))}
            </div>

            {/* Time + Staff + Duration */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeStr}
              </span>
              {appointment.staff && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {appointment.staff.display_name}
                </span>
              )}
              <span>{totalDuration} min</span>
            </div>
          </div>

          {/* Right: Price + Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-lg font-bold text-slate-900">
              {formatPrice(appointment.total_price_cents)}
            </span>

            {!appointment.isPast && (
              <div className="flex gap-2">
                {appointment.canModify ? (
                  <Link
                    href={`/shop/${appointment.company.slug}/book?reschedule=${appointment.id}`}
                  >
                    <Button variant="outline" size="sm" className="text-xs">
                      <Edit2 className="h-3 w-3 mr-1" />
                      Modify
                    </Button>
                  </Link>
                ) : (
                  appointment.status !== "CANCELLED" &&
                  appointment.status !== "COMPLETED" && (
                    <span className="text-xs text-slate-400 italic">
                      Within {appointment.rescheduleLimitMinutes}min window
                    </span>
                  )
                )}

                {appointment.canCancel ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => onCancel?.(appointment.id)}
                    disabled={cancelling}
                  >
                    {cancelling ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    Cancel
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const api = useApi();

  const [data, setData] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ data: AppointmentsData }>("/booking/my");
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/sign-in?redirect=/me/appointments");
      return;
    }
    if (isAuthenticated) {
      void fetchAppointments();
    }
  }, [authLoading, isAuthenticated, router, fetchAppointments]);

  const handleCancel = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    setCancellingId(bookingId);
    try {
      await api.post(`/booking/${bookingId}/cancel`);
      await fetchAppointments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const activeList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Appointments</h1>
          <p className="text-slate-500">View and manage your bookings</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            onClick={() => setTab("upcoming")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "upcoming"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setTab("past")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "past"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            Past ({past.length})
          </button>
        </div>

        {/* Appointments List */}
        {activeList.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              {tab === "upcoming"
                ? "No upcoming appointments"
                : "No past appointments"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {tab === "upcoming"
                ? "Book your first appointment to get started."
                : "Your appointment history will appear here."}
            </p>
            {tab === "upcoming" && (
              <Link href="/">
                <Button className="bg-brand text-white hover:bg-brand-hover">
                  Browse salons
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeList.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={handleCancel}
                cancelling={cancellingId === appointment.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
