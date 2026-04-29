"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/app/admin/contexts/AdminAuthContext";

const PRODUCT_LABELS: Record<string, string> = {
  RESERVAS: "Reservas",
  EVENTOS: "Eventos",
  CLASES: "Clases",
  PERSONALIZACION: "Personalización Base",
  CRM: "CRM Base",
  MENSAJERIA: "Mensajería Base",
  METRICAS: "Métricas",
};

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { loading, isAuthenticated, mustChangePassword, companyUser } = useAdminAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/admin/login");
      return;
    }
    if (mustChangePassword) {
      router.replace("/admin/change-password");
    }
  }, [isAuthenticated, loading, mustChangePassword, router]);

  const company = companyUser?.company;
  const entitlements = company?.capabilities;
  const availableUntil = company?.availableUntil ? new Date(company.availableUntil) : null;
  const isExpired = Boolean(availableUntil && availableUntil.getTime() < Date.now());

  const selectedCoreProducts = useMemo(
    () =>
      (entitlements?.products ?? [])
        .filter((product) => product.isCore)
        .map((product) => PRODUCT_LABELS[product.productCode] ?? product.productCode),
    [entitlements?.products],
  );

  const selectedAddOns = useMemo(
    () =>
      (entitlements?.products ?? [])
        .filter((product) => !product.isCore && !product.includedByDefault)
        .map((product) => PRODUCT_LABELS[product.productCode] ?? product.productCode),
    [entitlements?.products],
  );

  const checklist = useMemo(() => {
    const items: Array<{ title: string; tasks: string[] }> = [];
    const hasProduct = (code: string) =>
      entitlements?.products?.some((product) => product.productCode === code) ?? false;
    const hasTier = (tier: string) =>
      entitlements?.products?.some((product) => product.tierCode === tier) ?? false;

    if (hasProduct("RESERVAS")) {
      items.push({
        title: "Reservas",
        tasks: [
          "Configurá tus servicios",
          "Agregá tu personal",
          "Definí disponibilidad",
          "Revisá tu página pública",
          "Probá crear una reserva",
        ],
      });
    }

    if (hasProduct("EVENTOS")) {
      items.push({
        title: "Eventos",
        tasks: [
          "Creá tu primer evento",
          "Definí cupos y precio",
          "Revisá el formulario de registro",
          "Probá el flujo de inscripción",
        ],
      });
    }

    if (hasProduct("CLASES")) {
      items.push({
        title: "Clases",
        tasks: [
          "Creá tu primera clase",
          "Definí sesiones",
          "Agregá alumnos o inscripciones",
          "Revisá asistencia",
        ],
      });
    }

    if (hasTier("PERSONALIZACION_PLUS")) {
      items.push({
        title: "Personalización Pro",
        tasks: [
          "Ajustá CTA principal",
          "Revisá layout",
          "Configurá footer",
          "Configurá anuncios",
        ],
      });
    }

    if (hasTier("METRICAS_PRO")) {
      items.push({
        title: "Métricas",
        tasks: ["Tus métricas se van a llenar a medida que operes."],
      });
    }

    if (hasTier("MENSAJERIA_PRO")) {
      items.push({
        title: "Mensajería Pro",
        tasks: [
          "Configurá canales de comunicación",
          "Revisá recordatorios",
          "Probá un mensaje de prueba, si es seguro",
        ],
      });
    }

    if (hasTier("CRM_PRO")) {
      items.push({
        title: "CRM Pro",
        tasks: [
          "Importá clientes",
          "Segmentá clientes",
          "Revisá historial",
        ],
      });
    }

    return items;
  }, [entitlements?.products]);

  if (loading || !isAuthenticated || mustChangePassword) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-admin-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-admin-page-bg px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="admin-card space-y-6 px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-admin-brand-soft-text">
                Onboarding
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {isExpired ? "Tu prueba gratis terminó" : "Tu prueba gratis ya empezó"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                {isExpired
                  ? "Tu cuenta sigue acá. Activá tu plan para volver a usar las funciones que elegiste."
                  : "Tenés un mes para probar Priconpri con los productos que elegiste. Configurá lo básico y empezá a operar."}
              </p>
            </div>

            <div className="rounded-2xl border border-admin-border bg-admin-surface-subtle px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Fin de prueba</p>
              <p className="mt-1">
                {availableUntil
                  ? new Intl.DateTimeFormat("es-BO", { dateStyle: "long" }).format(availableUntil)
                  : "Sin fecha"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-admin-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Productos elegidos
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCoreProducts.length > 0 ? (
                  selectedCoreProducts.map((product) => (
                    <span
                      key={product}
                      className="rounded-full bg-admin-brand-soft px-3 py-1 text-xs font-semibold text-admin-brand-soft-text"
                    >
                      {product}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Todavía no hay productos activos.</span>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-admin-border bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Add-ons elegidos
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAddOns.length > 0 ? (
                  selectedAddOns.map((product) => (
                    <span
                      key={product}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {product}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No elegiste add-ons por ahora.</span>
                )}
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {checklist.map((group) => (
            <article key={group.title} className="admin-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-admin-brand-soft-text">
                {group.title}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {group.tasks.map((task) => (
                  <li key={`${group.title}-${task}`}>{task}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="admin-card flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">No hace falta terminar todo ahora.</p>
            <p className="text-sm text-slate-600">Podés volver a este onboarding más tarde.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="border-admin-border">
              <Link href={company?.slug ? `/shop/${company.slug}` : "/"}>Ver mi página pública</Link>
            </Button>
            <Button asChild className="bg-admin-brand text-white hover:bg-admin-brand-hover">
              <Link href="/admin/dashboard">Ir al panel</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
