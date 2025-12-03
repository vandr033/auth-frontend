"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";

const mockAppointments = [
  {
    id: "1",
    service: "Haircut + Beard",
    staff: "Juan Perez",
    date: "2025-02-05",
    time: "10:30 AM",
    status: "Confirmed",
  },
  {
    id: "2",
    service: "Classic haircut",
    staff: "Maria Lopez",
    date: "2025-01-28",
    time: "4:00 PM",
    status: "Completed",
  },
];

export default function AppointmentsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/sign-in");
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <p className="text-sm text-text-muted">Loading your appointments...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-page px-4 py-10 text-text-main sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-muted">
              My appointments
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Upcoming & past</h1>
            <p className="text-text-muted">
              This is a placeholder list. We will connect it to the bookings API soon.
            </p>
          </div>
          <Link href="/barber-shop">
            <Button className="bg-brand text-white hover:bg-brand-hover">
              Reserve now
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {mockAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="border-surface-border bg-surface shadow-card"
            >
              <CardHeader>
                <CardTitle className="text-xl font-semibold">
                  {appointment.service}
                </CardTitle>
                <CardDescription className="text-text-muted">
                  With {appointment.staff}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-text-muted">
                  Date: <span className="text-text-main">{appointment.date}</span>
                </p>
                <p className="text-text-muted">
                  Time: <span className="text-text-main">{appointment.time}</span>
                </p>
                <p className="text-text-muted">
                  Status:{" "}
                  <span className="font-semibold text-brand">{appointment.status}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
