import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { DemoLaunchButton } from "./DemoLaunchButton";
import type { DemoAddon, DemoExperience, DemoProduct } from "../_lib/catalog";
import { demoAddons, demoProducts } from "../_lib/catalog";

function DemoHeader() {
    return (
        <header className="border-b border-slate-950/10 bg-biz-surface">
            <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
                <Link href="/demo" aria-label="PriConPri, ir al hub de demos" className="shrink-0 rounded-sm focus-visible:outline-none">
                    <Image src="/assets/priconpri/logo-horizontal-black.webp" alt="PriConPri" width={166} height={42} priority className="h-8 w-auto sm:h-9" />
                </Link>
                <nav aria-label="Navegación de demostraciones" className="flex items-center gap-3 sm:gap-6">
                    <Link href="/demo#productos" className="hidden font-bebas text-sm uppercase tracking-[0.08em] text-slate-700 hover:text-biz-barbie-pink sm:inline-flex">
                        Productos
                    </Link>
                    <Link href="/negocios/crear-cuenta" className="inline-flex min-h-10 items-center gap-2 bg-biz-heading-dark px-4 font-bebas text-xs uppercase tracking-[0.06em] text-white transition-colors hover:bg-biz-barbie-pink sm:px-5 sm:text-sm">
                        Quiero PriConPri <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </nav>
            </div>
        </header>
    );
}

function DemoFooter() {
    return (
        <footer className="border-t border-slate-950/10 bg-biz-surface">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p>PriConPri · Una experiencia real, con datos de ejemplo.</p>
                <Link href="/demo" className="inline-flex min-h-10 items-center gap-2 font-bebas uppercase tracking-[0.06em] text-biz-barbie-pink hover:text-biz-cta-hover">
                    Volver a todas las demos <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </footer>
    );
}

function PublicLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
    return (
        <Link
            href={href}
            className={className ?? "inline-flex min-h-11 w-full items-center justify-center gap-2 border border-slate-950/20 px-4 py-3 font-bebas text-sm font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:border-biz-barbie-pink hover:text-biz-barbie-pink sm:w-auto"}
        >
            {children} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
    );
}

function ProductCard({ product }: { product: DemoProduct }) {
    const highlighted = product.key === "reservas";
    return (
        <article className={`flex h-full flex-col p-5 sm:p-6 ${highlighted ? "bg-biz-yellow" : "bg-white"}`}>
            <div className="flex items-center justify-between gap-4">
                <p className="font-bebas text-xs font-semibold uppercase tracking-[0.12em] text-biz-barbie-pink">{product.number} / {product.company}</p>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            </div>
            <h3 className="mt-6 font-business-display text-3xl font-black uppercase leading-[0.9] tracking-tight text-biz-heading-dark sm:text-4xl">
                <Link href={product.href} className="rounded-sm focus-visible:outline-none">{product.name}</Link>
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-700">{product.summary}</p>
            <div className="mt-6 border-t border-slate-950/15 pt-4">
                <p className="mb-3 font-bebas text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">Dos perspectivas, un mismo sistema</p>
                <div className="flex flex-col gap-2.5">
                    <PublicLink href={product.publicDestination}>Probar como cliente</PublicLink>
                    <DemoLaunchButton profile={product.key} className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-biz-heading-dark px-4 py-3 font-bebas text-sm font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-biz-barbie-pink disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                        Ver panel administrativo
                    </DemoLaunchButton>
                </div>
            </div>
            <Link href={product.href} className="mt-4 inline-flex min-h-10 items-center gap-2 self-start font-bebas text-xs uppercase tracking-[0.08em] text-biz-barbie-pink hover:text-biz-cta-hover">
                Cómo funciona <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
        </article>
    );
}

export function DemoHubPage() {
    return (
        <div className="min-h-screen overflow-hidden bg-biz-surface text-biz-heading-dark">
            <DemoHeader />
            <main>
                <section aria-labelledby="demo-heading" className="relative border-b border-slate-950/10">
                    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
                        <div className="max-w-3xl">
                            <p className="mb-5 inline-flex items-center gap-2 font-bebas text-sm font-semibold uppercase tracking-[0.14em] text-biz-barbie-pink">
                                <span className="h-2 w-2 rounded-full bg-biz-barbie-pink" aria-hidden="true" />
                                PriConPri · Demo en vivo
                            </p>
                            <h1 id="demo-heading" className="font-business-display text-[clamp(3.65rem,10vw,7.7rem)] font-black uppercase leading-[0.79] tracking-[-0.025em]">
                                Probá<br />PriConPri<span className="text-biz-barbie-pink">.</span>
                            </h1>
                            <p className="mt-7 max-w-[38rem] text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-slate-700">
                                No es un video. No es una maqueta. <strong className="font-semibold text-biz-heading-dark">Es PriConPri funcionando con datos de ejemplo.</strong>
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link href="#productos" className="inline-flex min-h-12 items-center gap-2 bg-biz-cta-primary px-6 font-bebas text-sm font-semibold uppercase tracking-[0.07em] text-white transition-colors hover:bg-biz-cta-hover">
                                    Elegí qué explorar <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                </Link>
                                <DemoLaunchButton profile="completo" className="inline-flex min-h-12 items-center justify-center gap-2 border border-slate-950/25 bg-transparent px-5 font-bebas text-sm font-semibold uppercase tracking-[0.06em] text-slate-950 transition-colors hover:border-biz-barbie-pink hover:text-biz-barbie-pink disabled:cursor-wait disabled:opacity-70">
                                    Explorar suite completa
                                </DemoLaunchButton>
                            </div>
                        </div>
                        <div className="relative flex min-h-[245px] flex-col justify-between overflow-hidden bg-biz-barbie-pink p-6 text-white sm:min-h-[300px] sm:p-9 lg:rotate-[1deg]">
                            <span className="font-bebas text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Una experiencia. Dos lados.</span>
                            <div className="relative z-10 max-w-md">
                                <p className="font-business-display text-4xl font-black uppercase leading-[0.88] sm:text-6xl">Tu cliente<br />avanza.</p>
                                <p className="mt-3 font-business-display text-4xl font-black uppercase leading-[0.88] text-biz-yellow sm:text-6xl">Tu equipo<br />lo gestiona.</p>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-white/35 pt-4 font-bebas text-xs uppercase tracking-[0.1em]">
                                <span>Cliente → operación</span><span>PriConPri · Demo real</span>
                            </div>
                            <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border-[22px] border-white/15 sm:h-56 sm:w-56" />
                        </div>
                    </div>
                </section>

                <section id="productos" aria-labelledby="products-heading" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
                    <div className="mb-8 flex flex-col gap-5 border-b border-slate-950/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="font-bebas text-xs font-semibold uppercase tracking-[0.14em] text-biz-barbie-pink">01 / Productos</p>
                            <h2 id="products-heading" className="mt-3 font-business-display text-[clamp(2.7rem,5.4vw,4.5rem)] font-black uppercase leading-[0.85] tracking-tight">Probalo desde<br className="hidden sm:block" /> cada perspectiva.</h2>
                        </div>
                        <p className="max-w-md text-sm leading-relaxed text-slate-600">La experiencia pública y el panel administrativo trabajan con la misma empresa de ejemplo.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                        {demoProducts.map((product, index) => (
                            <div key={product.key} className={index < 2 ? "md:col-span-1 lg:col-span-3" : "md:col-span-1 lg:col-span-2"}>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </section>

                <section id="addons" aria-labelledby="addons-heading" className="bg-biz-heading-dark text-white">
                    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="font-bebas text-xs font-semibold uppercase tracking-[0.14em] text-biz-yellow">02 / Add-ons</p>
                                <h2 id="addons-heading" className="mt-3 font-business-display text-[clamp(2.8rem,6vw,5rem)] font-black uppercase leading-[0.83]">Más control<br />en cada detalle.</h2>
                            </div>
                            <p className="max-w-sm text-sm leading-relaxed text-white/70">Entrá directamente a cada módulo en el panel real de Club Horizonte.</p>
                        </div>
                        <div className="grid gap-x-8 md:grid-cols-3">
                            {demoAddons.map((addon) => <AddonRow key={addon.key} addon={addon} />)}
                        </div>
                    </div>
                </section>

                <section aria-labelledby="complete-heading" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                    <div className="grid gap-8 bg-biz-yellow p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end lg:p-14">
                        <div className="max-w-3xl">
                            <p className="font-bebas text-xs font-bold uppercase tracking-[0.14em] text-biz-barbie-pink">03 / Suite completa · Club Horizonte</p>
                            <h2 id="complete-heading" className="mt-4 font-business-display text-[clamp(2.9rem,6.5vw,5.7rem)] font-black uppercase leading-[0.82] tracking-tight">¿Querés verlo<br />todo junto?</h2>
                            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-800">Explorá cómo funcionaría PriConPri en una empresa que utiliza todos los productos y add-ons. El panel te conecta con cada operación real.</p>
                        </div>
                        <div className="flex flex-col items-start gap-3 lg:items-end">
                            <DemoLaunchButton profile="completo" className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-biz-barbie-pink px-6 font-bebas text-sm font-semibold uppercase tracking-[0.07em] text-white transition-colors hover:bg-biz-cta-hover disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                                Explorar Suite Completa
                            </DemoLaunchButton>
                            <Link href="/shop/club-horizonte-demo" className="inline-flex min-h-10 items-center gap-2 font-bebas text-xs font-semibold uppercase tracking-[0.06em] text-slate-900 hover:text-biz-barbie-pink">
                                Ver experiencia pública <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="border-t border-slate-950/10 bg-white">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                        <p className="font-business-display text-2xl font-black uppercase tracking-tight sm:text-3xl">¿Lista tu operación para avanzar?</p>
                        <Link href="/negocios/crear-cuenta" className="inline-flex min-h-11 items-center justify-center gap-2 self-start bg-biz-cta-primary px-5 font-bebas text-sm font-semibold uppercase tracking-[0.06em] text-white hover:bg-biz-cta-hover">
                            Quiero PriConPri <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </section>
            </main>
            <DemoFooter />
        </div>
    );
}

function AddonRow({ addon }: { addon: DemoAddon }) {
    return (
        <article className="flex flex-col items-start border-t border-white/25 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="mb-4 sm:mb-0">
                <p className="font-bebas text-xs font-semibold uppercase tracking-[0.12em] text-biz-yellow">{addon.number} / Add-on</p>
                <h3 className="mt-2 font-business-display text-2xl font-black uppercase leading-none"><Link href={addon.href} className="rounded-sm hover:text-biz-yellow focus-visible:outline-none">{addon.name}</Link></h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{addon.summary}</p>
                <Link href={addon.href} className="mt-3 inline-flex min-h-9 items-center gap-2 font-bebas text-xs font-semibold uppercase tracking-[0.07em] text-biz-yellow hover:text-white">
                    Más sobre el módulo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
            <DemoLaunchButton profile="completo" destination={addon.adminDestination} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 border border-white/45 px-4 font-bebas text-xs font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:border-biz-yellow hover:text-biz-yellow disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                Explorar módulo
            </DemoLaunchButton>
        </article>
    );
}

export function DemoProductPage({ product }: { product: DemoExperience }) {
    return (
        <div className="min-h-screen overflow-hidden bg-biz-surface text-biz-heading-dark">
            <DemoHeader />
            <main>
                <section className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
                    <Link href="/demo" className="inline-flex min-h-10 items-center gap-2 font-bebas text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 hover:text-biz-barbie-pink">
                        ← Todas las demos
                    </Link>
                    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                        <div>
                            <p className="font-bebas text-xs font-semibold uppercase tracking-[0.13em] text-biz-barbie-pink">{product.number} / {product.company} · Demo en vivo</p>
                            <h1 className="mt-4 font-business-display text-[clamp(3.5rem,10vw,7.4rem)] font-black uppercase leading-[0.79] tracking-[-0.025em]">{product.name}<span className="text-biz-barbie-pink">.</span></h1>
                        </div>
                        <p className="max-w-xl pb-1 text-base leading-relaxed text-slate-700">{product.summary} Recorré la experiencia pública y después encontrá su operación en el panel real.</p>
                    </div>
                    <div className="mt-9 inline-flex items-center gap-2 border-y border-slate-950/15 py-3 font-bebas text-xs font-semibold uppercase tracking-[0.09em] text-slate-700">
                        <span className="h-2 w-2 rounded-full bg-biz-barbie-pink" aria-hidden="true" /> Datos de ejemplo · {product.company}
                    </div>
                </section>

                <section aria-label={`Dos maneras de explorar ${product.name}`} className="mx-auto grid max-w-7xl gap-3 px-5 pb-16 sm:px-8 sm:pb-20 lg:grid-cols-2">
                    <article className="flex min-h-[310px] flex-col items-start bg-white p-6 sm:p-9">
                        <p className="font-bebas text-xs font-bold uppercase tracking-[0.13em] text-biz-barbie-pink">Así lo ve tu cliente</p>
                        <h2 className="mt-5 max-w-lg font-business-display text-3xl font-black uppercase leading-[0.9] sm:text-5xl">Probá la experiencia completa.</h2>
                        <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-700">{product.customerFlow} Al avanzar, esa información aparece del lado del negocio.</p>
                        <PublicLink href={product.publicDestination} className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 bg-biz-cta-primary px-5 py-3 font-bebas text-sm font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-biz-cta-hover sm:w-auto">
                            Probar página pública
                        </PublicLink>
                    </article>
                    <article className="flex min-h-[310px] flex-col items-start bg-biz-heading-dark p-6 text-white sm:p-9">
                        <p className="font-bebas text-xs font-bold uppercase tracking-[0.13em] text-biz-yellow">Así lo administrás vos</p>
                        <h2 className="mt-5 max-w-lg font-business-display text-3xl font-black uppercase leading-[0.9] sm:text-5xl">La operación, desde el panel real.</h2>
                        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75">{product.adminFlow} Las modificaciones y envíos están deshabilitados en esta demo.</p>
                        <DemoLaunchButton profile={product.key} className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 bg-biz-yellow px-5 py-3 font-bebas text-sm font-semibold uppercase tracking-[0.06em] text-biz-heading-dark transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                            Explorar panel administrativo
                        </DemoLaunchButton>
                    </article>
                </section>
                <p className="mx-auto max-w-7xl px-5 pb-12 text-xs text-slate-500 sm:px-8">Al final de un flujo público podés ver cómo {product.actionLabel} aparecería en el panel.</p>
            </main>
            <DemoFooter />
        </div>
    );
}

export function DemoAddonPage({ addon }: { addon: DemoAddon }) {
    return (
        <div className="min-h-screen overflow-hidden bg-biz-surface text-biz-heading-dark">
            <DemoHeader />
            <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
                <Link href="/demo#addons" className="inline-flex min-h-10 items-center gap-2 font-bebas text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 hover:text-biz-barbie-pink">← Todos los add-ons</Link>
                <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-end">
                    <div>
                        <p className="font-bebas text-xs font-semibold uppercase tracking-[0.13em] text-biz-barbie-pink">{addon.number} / Add-on · Club Horizonte</p>
                        <h1 className="mt-4 max-w-4xl font-business-display text-[clamp(3rem,8vw,6.5rem)] font-black uppercase leading-[0.8] tracking-[-0.025em]">{addon.name}<span className="text-biz-barbie-pink">.</span></h1>
                    </div>
                    <p className="max-w-xl text-base leading-relaxed text-slate-700">{addon.summary} Entrá directamente a esta pantalla en el panel real, con el perfil completo de ejemplo.</p>
                </section>
                <section className="mt-12 flex flex-col items-start gap-6 bg-biz-heading-dark p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="font-bebas text-xs font-semibold uppercase tracking-[0.13em] text-biz-yellow">Así lo administrás vos</p>
                        <h2 className="mt-3 font-business-display text-3xl font-black uppercase leading-[0.9] sm:text-4xl">El módulo en el panel que ya usa PriConPri.</h2>
                        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">Vas a entrar a Club Horizonte. Los datos son de ejemplo y los cambios están deshabilitados.</p>
                    </div>
                    <DemoLaunchButton profile="completo" destination={addon.adminDestination} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 bg-biz-yellow px-6 font-bebas text-sm font-semibold uppercase tracking-[0.07em] text-biz-heading-dark transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                        Abrir {addon.name}
                    </DemoLaunchButton>
                </section>
            </main>
            <DemoFooter />
        </div>
    );
}
