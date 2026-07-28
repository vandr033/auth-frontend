"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { useShop } from "../../contexts/ShopContext";
import { getMyPublicRestaurantReservations, type PublicRestaurantReservation } from "../../lib/restaurantReservationsApi";

export default function MyRestaurantReservationsPage() {
  const { slug, company } = useShop();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<PublicRestaurantReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void getMyPublicRestaurantReservations(slug)
      .then((value) => setReservations(value.reservations))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No pudimos cargar tus reservas."))
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, slug]);

  if (loading || authLoading) return <main className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></main>;
  if (!isAuthenticated) return <main className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Iniciá sesión para ver tus reservas</h1><Link href={`/auth/sign-in?redirect=${encodeURIComponent(`/shop/${slug}/reservations`)}`} className="mt-5 inline-flex"><Button>Iniciar sesión</Button></Link></main>;

  return <main className="mx-auto max-w-3xl px-4 py-8 text-text-main sm:px-6"><header><p className="text-sm font-semibold text-brand">{company?.name}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Mis reservas</h1></header>{error ? <p role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : reservations.length === 0 ? <section className="mt-6 rounded-2xl border border-dashed border-surface-border p-8 text-center"><CalendarDays className="mx-auto h-7 w-7 text-text-muted"/><p className="mt-3 text-text-muted">Todavía no tenés reservas en este restaurante.</p><Link href={`/shop/${slug}/reserve`} className="mt-5 inline-flex"><Button>Reservar una mesa</Button></Link></section> : <div className="mt-6 space-y-3">{reservations.map((reservation) => <Link key={reservation.code} href={`/shop/${slug}/reservation/${reservation.code}`} className="block rounded-xl border border-surface-border bg-surface p-4 transition hover:border-brand"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{reservation.date} · {reservation.time}</p><p className="mt-1 text-sm text-text-muted">{reservation.partySize} {reservation.partySize === 1 ? "persona" : "personas"}</p></div><span className="rounded-full bg-section px-2.5 py-1 text-xs font-semibold">{reservation.status === "CONFIRMED" ? "Confirmada" : reservation.status === "CANCELLED" ? "Cancelada" : "Pendiente"}</span></div></Link>)}</div>}</main>;
}
