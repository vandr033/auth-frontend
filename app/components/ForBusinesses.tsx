import { CheckCircle2, Rocket } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const perks = [
  "Online bookings with instant confirmations",
  "Customer reminders that reduce no-shows",
  "Staff scheduling that adapts to your hours",
];

export function ForBusinesses() {
  return (
    <section
      id="for-businesses"
      className="relative overflow-hidden bg-slate-900 py-16 text-white sm:py-24"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-slate-900 to-slate-950" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            <Rocket className="h-4 w-4" />
            For businesses
          </p>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            Bring your barbershop online with a booking experience people love.
          </h2>
          <p className="text-lg text-white/80">
            Manage appointments, keep clients engaged, and give your team the tools they need to
            stay organized.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {perks.map((perk) => (
              <div
                key={perk}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                <p className="text-sm text-white/90">{perk}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(
          "w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur",
          "shadow-[0_20px_60px_rgba(15,23,42,0.35)]",
        )}>
          <div className="space-y-3 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
              Get started
            </p>
            <h3 className="text-2xl font-semibold">
              Ready to bring your calendar, services, and clients into one place?
            </h3>
            <p className="text-sm text-white/80">
              Create your account and publish your booking page in minutes. We will guide you through
              setup and connect your existing clients instantly.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button className="w-full rounded-md bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-card hover:bg-slate-100">
                  Create an account
                </Button>
              </Link>
              <Link href="/auth/sign-in" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full border-white/30 bg-transparent px-5 py-2 text-sm font-semibold text-white hover:border-white/60"
                >
                  Already onboard? Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
