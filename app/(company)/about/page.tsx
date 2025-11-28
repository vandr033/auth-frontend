"use client";
import React from "react";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/app/components/PrimaryButton";

export default function AboutPage() {
  const barbershopData = {
    name: "Premium Barbershop",
    totalStars: 4.5,
    totalReviews: 120,
    city: "New York",
  };
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
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold">About Us</h1>
        <p className="mt-4 text-lg text-text-muted">
          This page will house the brand story, values, and barber credentials. Keeping it live now ensures the
          navigation state and theming tokens work consistently across routes.
        </p>
      </div>
    </main>
  );
}
