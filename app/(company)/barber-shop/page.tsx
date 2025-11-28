"use client";
import React, { useEffect, useState } from "react";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DayOfWeek,
  isOpenAt,
  OpeningHours,
  OpeningWindow,
} from "@/utils/opening-hours";
import { Servicio } from "@/types/servicios";
import { Team } from "@/types/team";
import { Review } from "@/types/review";
import ThemeSettings from "@/components/ThemeSettings";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/app/components/PrimaryButton";

// Themed page guide:
// - Wrap sections in `bg-page` / `bg-section` containers and keep cards on `bg-surface`.
// - Pair cards with `border-surface-border shadow-card rounded-lg` and rely on text classes like `text-text-main` / `text-text-muted`.
// - Use `bg-brand` + `hover:bg-brand-hover` for CTAs so they automatically follow tenant colors.

const orderedDays: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const formatTime = (time: string) => {
  const [hourString, minuteString = "00"] = time.split(":");
  let hours = parseInt(hourString, 10);
  const minutes = minuteString.padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

const formatWindows = (windows: OpeningWindow[]) => {
  if (!windows.length) return "Closed";
  return windows
    .map((window) => `${formatTime(window.start)} - ${formatTime(window.end)}`)
    .join(", ");
};

type BarbershopData = {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  hours: OpeningHours;
  priceRange: string;
  images: string[];
  totalStars: number;
  totalReviews: number;
  googleMapUrl: string;
  servicios: Servicio[];
  team: Team;
  reviews: Review[];
};

// type ButtonProps = React.ComponentProps<typeof Button>;

// const PrimaryButton = ({ className, ...props }: ButtonProps) => (
//   <Button
//     className={cn(
//       "inline-flex min-w-[160px] items-center justify-center rounded-md bg-brand px-5 py-3 text-base font-semibold text-white shadow-card transition hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
//       className,
//     )}
//     {...props}
//   />
// );

export default function BarberShopPage() {
  const defaultHours: OpeningHours = {
    sunday: [{ start: "08:00", end: "18:00" }],
    monday: [{ start: "00:00", end: "18:00" }],
    tuesday: [{ start: "08:00", end: "18:00" }],
    wednesday: [{ start: "08:00", end: "18:00" }],
    thursday: [{ start: "08:00", end: "18:00" }],
    friday: [{ start: "08:00", end: "18:00" }],
    saturday: [{ start: "10:00", end: "14:00" }],
  };

  const [barbershopData, setBarbershopData] = useState<BarbershopData>({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    hours: defaultHours,
    priceRange: "",
    images: [],
    totalStars: 0,
    totalReviews: 0,
    googleMapUrl: "",
    servicios: [],
    team: {
      members: [],
    },
    reviews: [],
  });

  useEffect(() => {
    fetchBarbershopData();
  }, []);

  const fetchBarbershopData = async () => {
    // const response = await fetch('/api/barbershop');
    // const data = await response.json();
    // setBarbershopData(data);
    setBarbershopData({
      name: "La Creme",
      city: "Santa Cruz, Bolivia",
      address: "Av. 25 de Mayo 123",
      phone: "12345678",
      email: "la.creme@gmail.com",
      description:
        "La Creme is a barber shop that offers the best barber services in Santa Cruz, Bolivia.",
      hours: {
        sunday: [
          { start: "00:00", end: "06:00" },
          { start: "10:00", end: "12:00" },
        ],
        monday: [{ start: "00:00", end: "18:00" }],
        tuesday: [{ start: "08:00", end: "18:00" }],
        wednesday: [{ start: "08:00", end: "18:00" }],
        thursday: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "18:00" },
        ],
        friday: [{ start: "08:00", end: "18:00" }],
        saturday: [{ start: "08:00", end: "12:00" }],
      },
      priceRange: "$",
      images: [],
      totalStars: 4.2,
      totalReviews: 12,
      googleMapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.621626556612!2d-63.21265628566666!3d-17.39565668566666!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93b7b5b5b5b5b5b5%3A0x93b7b5b5b5b5b5b5!2sLa%20Creme!5e0!3m2!1ses!2sbo!4v1700266666666!5m2!1ses!2sbo",
      servicios: [
        {
          id: "1",
          name: "Corte de Pelo",
          description: "Corte de pelo para hombres",
          category_id: "1",
          price: 10,
          duration: 30,
        },
        {
          id: "2",
          name: "Corte de Pelo",
          description: "Corte de pelo para hombres",
          category_id: "1",
          price: 10,
          duration: 30,
        },
        {
          id: "3",
          name: "Corte de Pelo",
          description: "Corte de pelo para hombres",
          category_id: "1",
          price: 10,
          duration: 30,
        },
      ],
      team: {
        members: [
          {
            id: "1",
            name: "Juan Perez",
            position: "Barbero",
            image:
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
          },
          {
            id: "2",
            name: "Juan Perez",
            position: "Barbero",
            image:
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
          },
          {
            id: "3",
            name: "Juan Perez",
            position: "Barbero",
            image:
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
          },
        ],
      },
      reviews: [
        {
          id: "1",
          name: "Juan Perez",
          rating: 5,
          comment:
            "Excelente servicio, excelente equipo, me hicieron sentir como en casa. volverAc pronto. muchisimas gracias",
          date: "2022-01-01",
          image:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
        {
          id: "2",
          name: "Juan Perez",
          rating: 5,
          comment:
            "Excelente servicio, excelente equipo, me hicieron sentir como en casa. volverAc pronto. muchisimas gracias",
          date: "2022-01-01",
          image:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
        {
          id: "3",
          name: "Juan Perez",
          rating: 5,
          comment: "Excelente servicio",
          date: "2022-01-01",
          image:
            "https://images.unsplash.com/photo-1506794778202-cad84cf45f1a?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        },
      ],
    });
  };

  const getIsOpen = () => isOpenAt(barbershopData.hours);

  return (
    <main className="min-h-screen bg-page text-text-main">
      <section className="relative isolate overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/assets/barberShop.png')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
        <div className="absolute inset-0 bg-slate-950/70" aria-hidden />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
            Premium Barbershop
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {barbershopData.name || "Barber Shop"}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
            <Rating value={barbershopData.totalStars} readOnly>
              {Array.from({ length: 5 }).map((_, index) => (
                <RatingButton key={index} className="text-yellow-400" />
              ))}
            </Rating>
            <span>{barbershopData.totalStars.toFixed(1)}</span>
            <span className="text-white/80">
              {barbershopData.totalReviews}+ reseñas
            </span>
            <span aria-hidden>•</span>
            <span>{barbershopData.city}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton>Reserve now</PrimaryButton>
            <Button className="min-w-[160px] border border-white/60 bg-white/10 px-5 py-3 text-base font-semibold text-white transition hover:bg-white/25">
              Book a visit
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-lg border-surface-border bg-surface shadow-card">
            <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Status
            </CardHeader>
            <CardContent
              className={cn(
                "text-2xl font-bold",
                getIsOpen() ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {getIsOpen() ? "Abierto" : "Cerrado"}
            </CardContent>
          </Card>
          <Card className="rounded-lg border-surface-border bg-surface shadow-card">
            <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Direccion
            </CardHeader>
            <CardContent className="text-lg font-semibold text-text-main">
              {barbershopData.address}
            </CardContent>
          </Card>
          <Card className="rounded-lg border-surface-border bg-surface shadow-card">
            <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Telefono
            </CardHeader>
            <CardContent className="text-lg font-semibold text-text-main">
              {barbershopData.phone}
            </CardContent>
          </Card>
          <Card className="rounded-lg border-surface-border bg-surface shadow-card">
            <CardHeader className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Email
            </CardHeader>
            <CardContent className="text-lg font-semibold text-text-main">
              {barbershopData.email}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Location & Hours</h2>
              <p className="text-text-muted">
                Encuentranos facilmente o revisa nuestros horarios antes de agendar una cita.
              </p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-lg border-surface-border bg-surface shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-text-main">
                  Google Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barbershopData.googleMapUrl && (
                  <iframe
                    title="Ubicacion de la barberia"
                    src={barbershopData.googleMapUrl}
                    loading="lazy"
                    className="h-80 w-full rounded-lg border-0 shadow-inner sm:h-96"
                  ></iframe>
                )}
              </CardContent>
            </Card>
            <Card className="flex flex-col rounded-lg border-surface-border bg-surface shadow-card">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg font-semibold text-text-main">
                  Opening hours
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-surface-border pt-4">
                {orderedDays.map((day) => {
                  const windows = barbershopData.hours[day] ?? [];
                  const label = day.charAt(0).toUpperCase() + day.slice(1);
                  const display = formatWindows(windows);
                  const isClosed = windows.length === 0;

                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between py-2 text-sm sm:text-base"
                    >
                      <span className="font-semibold text-text-main">{label}</span>
                      <span className={isClosed ? "text-text-muted" : "text-text-main"}>
                        {display}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
              <CardFooter>
                <PrimaryButton className="w-full">Obtener indicaciones</PrimaryButton>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold">About us</h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-text-muted">
            {barbershopData.description}
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-semibold">Nuestros servicios</h2>
            <span className="text-sm uppercase tracking-[0.3em] text-text-muted">
              Price list
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbershopData.servicios.map((servicio) => (
              <Card
                key={servicio.id}
                className="h-full rounded-lg border-surface-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-text-main">
                    {servicio.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-text-muted">
                  <p>{servicio.description}</p>
                </CardContent>
                <CardFooter className="mt-auto flex flex-col gap-4 pt-0">
                  <div className="flex flex-wrap gap-3 text-sm font-semibold text-brand">
                    <span className="rounded-full bg-brand-soft-bg px-3 py-1 text-brand-soft-text">
                      ${servicio.price}
                    </span>
                    <span className="rounded-full bg-brand-soft-bg px-3 py-1 text-brand-soft-text">
                      {servicio.duration} min
                    </span>
                  </div>
                  <PrimaryButton className="w-full">Book now</PrimaryButton>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">Meet our team</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbershopData.team.members.map((member) => (
              <Card
                key={member.id}
                className="rounded-lg border-surface-border bg-surface text-center shadow-card"
              >
                <CardContent className="flex flex-col items-center gap-4 pt-6">
                  <div className="rounded-full border border-surface-border p-1 shadow-inner">
                    <div className="h-24 w-24 overflow-hidden rounded-full">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{member.name}</p>
                    <p className="text-sm text-text-muted">{member.position}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full rounded-md border border-transparent bg-brand-soft-bg px-4 py-2 text-brand-soft-text transition hover:border-brand hover:text-brand">
                    Book with {member.name.split(" ")[0]}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-semibold">What our clients say</h2>
          <div className="grid gap-6 lg:grid-cols-[0.45fr,0.55fr]">
            <Card className="items-center rounded-lg border-surface-border bg-brand-soft-bg py-10 text-center text-brand-soft-text shadow-inner">
              <h3 className="text-5xl font-bold text-brand">
                {barbershopData.totalStars.toFixed(1)}
              </h3>
              <Rating value={barbershopData.totalStars} readOnly>
                {Array.from({ length: 5 }).map((_, index) => (
                  <RatingButton key={index} className="text-yellow-500" />
                ))}
              </Rating>
              <p className="mt-2 text-text-muted">
                Basado en {barbershopData.totalReviews}+ reseñas verificadas
              </p>
            </Card>
            <Card className="rounded-lg border-surface-border bg-surface shadow-card">
              <CardContent className="space-y-6">
                {barbershopData.reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="flex flex-col gap-3 border-b border-surface-border pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-section">
                        <img
                          src={review.image}
                          alt={review.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-text-main">
                          {review.name}
                        </p>
                        <p className="text-sm text-text-muted">{review.date}</p>
                      </div>
                    </div>
                    <Rating value={review.rating} readOnly>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <RatingButton key={index} className="text-yellow-500" size={10} />
                      ))}
                    </Rating>
                    <p className="text-text-muted">{review.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold">Theme settings (preview)</h2>
          <p className="text-sm text-text-muted">
            Ajusta los colores y radios para ver como reaccionan los componentes en vivo.
          </p>
          <div className="mt-4">
            <ThemeSettings />
          </div>
        </section>
      </div>
    </main>
  );
}
