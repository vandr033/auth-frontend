"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessPricingBuilder } from "@/components/negocios/BusinessPricingBuilder";
import { resolveApiUrl } from "@/lib/api-url";
import { notify } from "@/lib/notify";
import {
  calculateBusinessPricing,
  formatBsAmount,
  sanitizePricingSelection,
} from "@/lib/negocios/pricing";
import { usePublicBusinessPricing } from "@/lib/negocios/usePublicBusinessPricing";
import {
  getDefaultTierForCoreProduct,
  type CoreTierSelection,
  type PublicAddOnKey,
} from "@/lib/negocios/business-pricing";

type CompanyTypeOption = {
  id: number;
  key: string;
  name: string;
  name_i18n?: Record<string, string>;
};

type SignupErrorPayload = {
  message?: string;
  errors?: {
    fieldErrors?: Record<string, string[] | undefined>;
  };
} | null;

const FALLBACK_COMPANY_TYPES: CompanyTypeOption[] = [
  { id: 1, key: "estetica", name: "Estética" },
  { id: 2, key: "wellness", name: "Wellness" },
  { id: 3, key: "salud", name: "Salud" },
  { id: 4, key: "fitness", name: "Fitness" },
];

function buildSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function readErrorMessage(payload: SignupErrorPayload): string {
  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  const fieldErrors = payload?.errors?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const firstFieldError = Object.values(fieldErrors).find(
      (value) => Array.isArray(value) && value.length > 0,
    ) as string[] | undefined;

    if (firstFieldError?.[0]) {
      return firstFieldError[0];
    }
  }

  return "No pudimos crear tu cuenta.";
}

export function BusinessSignupWizard() {
  const { pricingConfig, isLoading: pricingLoading } = usePublicBusinessPricing();
  const [step, setStep] = useState(1);
  const [companyTypes, setCompanyTypes] = useState<CompanyTypeOption[]>(FALLBACK_COMPANY_TYPES);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    slug: "",
  });
  const [selection, setSelection] = useState<{
    coreSelections: CoreTierSelection[];
    addOns: PublicAddOnKey[];
    billingCycle: "monthly" | "annual";
  }>({
    coreSelections: [
      {
        productKey: "RESERVAS",
        tierKey: getDefaultTierForCoreProduct("RESERVAS"),
      },
    ],
    addOns: [],
    billingCycle: "monthly",
  });

  const sanitizedSelection = useMemo(
    () => sanitizePricingSelection(selection, pricingConfig),
    [pricingConfig, selection],
  );
  const pricing = useMemo(
    () => calculateBusinessPricing(sanitizedSelection, pricingConfig),
    [pricingConfig, sanitizedSelection],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(resolveApiUrl("/api/business-signup/options"), {
          credentials: "include",
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.companyTypes) {
          return;
        }

        if (!cancelled) {
          setCompanyTypes(payload.companyTypes);
          setForm((current) => ({
            ...current,
            businessType: current.businessType || payload.companyTypes[0]?.key || "",
          }));
        }
      } catch {
        // Keep fallback types.
      } finally {
        if (!cancelled) {
          setLoadingTypes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSelection((current) => {
      const nextSelection = sanitizePricingSelection(current, pricingConfig);
      const hasChanged =
        JSON.stringify(nextSelection.coreSelections) !== JSON.stringify(current.coreSelections) ||
        nextSelection.addOns.join("|") !== current.addOns.join("|");

      return hasChanged ? nextSelection : current;
    });
  }, [pricingConfig]);

  useEffect(() => {
    setForm((current) => {
      const nextSlug = buildSlug(current.businessName);
      if (!current.businessName) return current;
      if (current.slug && current.slug !== buildSlug(current.slug)) return current;

      return {
        ...current,
        slug: nextSlug,
      };
    });
  }, [form.businessName]);

  const canGoToProducts =
    form.businessName.trim().length > 1 &&
    form.businessType.trim().length > 0 &&
    form.ownerName.trim().length > 1 &&
    form.email.trim().length > 3 &&
    form.phone.trim().length > 5 &&
    form.password.length >= 8 &&
    buildSlug(form.slug || form.businessName).length >= 2;

  const canSubmit = canGoToProducts && pricing.validationErrors.length === 0;
  const isProductsStep = step === 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await fetch(resolveApiUrl("/api/business-signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: form.businessName,
          businessType: form.businessType,
          ownerName: form.ownerName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          slug: buildSlug(form.slug || form.businessName),
          coreSelections: sanitizedSelection.coreSelections,
          addOns: sanitizedSelection.addOns,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(readErrorMessage(payload));
      }

      await notify.success(
        "Tu cuenta está lista",
        "Te estamos llevando al onboarding.",
      );

      window.location.assign(payload.redirectTo || "/admin/onboarding");
    } catch (error) {
      await notify.error(
        "No pudimos crear tu cuenta",
        error instanceof Error ? error.message : "Probá de nuevo en unos segundos.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-biz-surface px-6 py-12 lg:px-10 lg:py-16">
      <div
        className={`mx-auto grid gap-8 ${
          isProductsStep
            ? "max-w-[1280px]"
            : "max-w-7xl lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]"
        }`}
      >
        <section className={`min-w-0 space-y-6 ${isProductsStep ? "lg:col-span-1" : ""}`}>
          <div>
            <p className="font-bebas text-[16px] uppercase tracking-[0.18em] text-biz-barbie-pink">
              /negocios/crear-cuenta
            </p>
            <h1 className="mt-2 font-business-display text-[clamp(3rem,8vw,6.2rem)] uppercase leading-[0.84] tracking-[-0.03em] text-biz-heading-dark">
              Creá tu cuenta.
            </h1>
            <p className="mt-5 max-w-xl text-[1rem] leading-8 text-slate-700">
              Elegí tus productos, arrancá con un mes gratis y entrá directo al onboarding. Sin tarjeta. Sin vueltas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              "1. Datos del negocio",
              "2. Elegí tus productos",
              "3. Revisá tu prueba gratis",
            ].map((item, index) => (
              <span
                key={item}
                className={`px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] ${
                  step === index + 1
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-slate-500"
                }`}
              >
                {item}
              </span>
            ))}
          </div>

          {step === 2 ? (
            <div className="space-y-6">
              <BusinessPricingBuilder
                value={selection}
                onChange={setSelection}
                ctaHref="#review"
                ctaLabel="Seguir a revisión"
                pricingConfig={pricingConfig}
                isPricingLoading={pricingLoading}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-none border-black text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-black hover:text-white"
                >
                  Volver a datos
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={pricing.validationErrors.length > 0}
                  className="h-11 rounded-none bg-black text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-barbie-pink"
                >
                  Seguir a revisión
                </Button>
              </div>
            </div>
          ) : (
            <Card className="rounded-none border-black bg-white shadow-none">
              <CardContent className="space-y-6 p-6">
                {step === 1 ? (
                  <>
                    <div className="grid gap-5">
                      <div className="grid gap-2">
                        <Label htmlFor="businessName">Nombre del negocio</Label>
                        <Input
                          id="businessName"
                          value={form.businessName}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              businessName: event.target.value,
                              slug: buildSlug(event.target.value),
                            }))
                          }
                          placeholder="Monas Studio"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="businessType">Tipo de negocio</Label>
                        <Select
                          value={form.businessType}
                          onValueChange={(value) =>
                            setForm((current) => ({ ...current, businessType: value }))
                          }
                          disabled={loadingTypes}
                        >
                          <SelectTrigger id="businessType">
                            <SelectValue placeholder="Elegí un tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyTypes.map((type) => (
                              <SelectItem key={type.key} value={type.key}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ownerName">Nombre del dueño</Label>
                        <Input
                          id="ownerName"
                          value={form.ownerName}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, ownerName: event.target.value }))
                          }
                          placeholder="Sebastián"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, email: event.target.value }))
                            }
                            placeholder="hola@tunegocio.com"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                          <Input
                            id="phone"
                            value={form.phone}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, phone: event.target.value }))
                            }
                            placeholder="59170000000"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="password">Contraseña</Label>
                          <Input
                            id="password"
                            type="password"
                            value={form.password}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, password: event.target.value }))
                            }
                            placeholder="Mínimo 8 caracteres"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="slug">Slug sugerido</Label>
                          <Input
                            id="slug"
                            value={form.slug}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, slug: buildSlug(event.target.value) }))
                            }
                            placeholder="monas-studio"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!canGoToProducts}
                        className="h-11 rounded-none bg-black text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-barbie-pink"
                      >
                        Seguir a productos
                      </Button>
                      <Link
                        href="/negocios"
                        className="inline-flex h-11 items-center justify-center border border-black px-5 text-[11px] font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-black hover:text-white"
                      >
                        Volver a /negocios
                      </Link>
                    </div>
                  </>
                ) : null}

                {step === 3 ? (
                  <div id="review" className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="border border-black p-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Negocio
                        </p>
                        <p className="mt-3 font-bebas text-[1.9rem] uppercase">{form.businessName}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {form.ownerName} · {form.email}
                        </p>
                        <p className="text-sm leading-6 text-slate-700">{form.phone}</p>
                        <p className="mt-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          /{buildSlug(form.slug || form.businessName)}
                        </p>
                      </div>

                      <div className="border border-black bg-black p-5 text-white">
                        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/60">
                          Tu prueba gratis
                        </p>
                        <p className="mt-3 font-business-display text-[2.4rem] uppercase leading-[0.92] text-biz-yellow">
                          {pricing.trialLengthDays} días
                        </p>
                        <p className="mt-3 text-sm leading-7 text-white/80">
                          {pricing.firstMonthFree
                            ? "Empezás sin tarjeta y con el primer mes gratis. Después activás el plan que mejor cierre con tu operación."
                            : "Empezás sin tarjeta durante la prueba. Después activás el plan que mejor cierre con tu operación."}
                        </p>
                      </div>
                    </div>

                    <div className="border border-black bg-white p-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                        Precio estimado después del mes gratis
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            Subtotal mensual
                          </p>
                          <p className="mt-2 font-bebas text-[1.7rem] uppercase">
                            {formatBsAmount(pricing.subtotalMonthly)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            Bundle
                          </p>
                          <p className="mt-2 font-bebas text-[1.7rem] uppercase">
                            {pricing.bundleDiscountPercent}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            Mensual estimado
                          </p>
                          <p className="mt-2 font-bebas text-[1.7rem] uppercase">
                            {formatBsAmount(pricing.finalMonthly)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                            Equivalente anual
                          </p>
                          <p className="mt-2 font-bebas text-[1.7rem] uppercase">
                            {formatBsAmount(pricing.finalAnnualEquivalent)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                        className="h-11 rounded-none border-black text-[11px] font-black uppercase tracking-[0.08em] text-black hover:bg-black hover:text-white"
                      >
                        Volver a productos
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          void handleSubmit();
                        }}
                        disabled={!canSubmit || submitting}
                        className="h-11 rounded-none bg-biz-cta-primary text-[11px] font-black uppercase tracking-[0.08em] text-white hover:bg-biz-cta-hover"
                      >
                        {submitting ? "Creando tu cuenta..." : "Crear mi cuenta gratis"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </section>

        {!isProductsStep ? (
          <aside className="min-w-0 space-y-4">
          <div className="border border-black bg-white p-6">
            <p className="font-bebas text-[15px] uppercase tracking-[0.14em] text-biz-barbie-pink">
              Lo que desbloqueás desde el día uno
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
              <li>Elegís al menos un producto principal.</li>
              <li>Probás Priconpri gratis por un mes.</li>
              <li>Entrás directo a `/admin/onboarding`.</li>
              <li>No te pedimos tarjeta para arrancar.</li>
              <li>Tienda aparece, pero queda deshabilitada por ahora.</li>
            </ul>
          </div>

          <div className="border border-black bg-black p-6 text-white">
            <p className="font-bebas text-[15px] uppercase tracking-[0.14em] text-biz-yellow">
              Tu combinación actual
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {pricing.selectedProducts.map((product) => (
                <span
                  key={product}
                  className="inline-flex bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black"
                >
                  {product}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/78">
              Si querés estimar con anual, podés cambiar el toggle en el paso 2. El alta sigue arrancando sin tarjeta y respeta la configuración pública actual.
            </p>
          </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
