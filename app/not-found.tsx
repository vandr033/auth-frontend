import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-biz-surface text-biz-heading-dark">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-4rem] top-16 h-40 w-40 rounded-full bg-biz-barbie-pink/18 blur-3xl" />
        <div className="absolute right-[-3rem] top-28 h-52 w-52 rounded-full bg-biz-sky-surge/18 blur-3xl" />
        <div className="absolute bottom-10 left-[10%] h-32 w-32 rounded-full bg-biz-yellow/55 blur-2xl" />
        <div className="absolute left-[48%] top-[14%] h-56 w-56 rotate-[10deg] bg-[radial-gradient(circle,rgba(231,56,134,0.12)_0%,rgba(231,56,134,0)_70%)]" />
        <div className="absolute right-[14%] top-[52%] h-64 w-64 rotate-[-14deg] bg-[radial-gradient(circle,rgba(6,180,227,0.12)_0%,rgba(6,180,227,0)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(243,243,243,0)_0%,rgba(243,243,243,0.86)_65%,rgba(243,243,243,1)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col px-6 py-8 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:ring-offset-4"
        >
          <Image
            src="/assets/priconpri/logo-horizontal-black.webp"
            alt="PRICONPRI"
            width={600}
            height={370}
            priority
            className="h-10 w-auto sm:h-11"
          />
        </Link>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-14 lg:py-12">
          <div className="max-w-[720px]">
            <div className="inline-flex items-center gap-3 border border-black/10 bg-white/80 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-slate-600 uppercase shadow-[0_14px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-biz-barbie-pink" />
              Error 404
            </div>

            <h1 className="mt-6 font-business-display text-[clamp(3.6rem,12vw,8.8rem)] leading-[0.84] font-black uppercase tracking-[-0.03em]">
              <span className="block">ESTA</span>
              <span className="block text-biz-sky-surge">PÁGINA</span>
              <span className="block">SE FUE A</span>
              <span className="block text-biz-barbie-pink">OTRA CITA</span>
            </h1>

            <p className="mt-6 max-w-[60ch] text-base leading-7 text-slate-700 sm:text-lg">
              El enlace que abriste ya no existe, cambió de lugar o llegó con una dirección
              incompleta. Volvé al inicio, explorá el marketplace o retomá tu búsqueda desde una
              ruta segura dentro de PriConPri.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-none bg-biz-cta-primary px-6 text-[11px] font-bold tracking-[0.08em] text-white uppercase transition-colors hover:bg-biz-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biz-barbie-pink focus-visible:ring-offset-2"
              >
                Volver al inicio
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex min-h-12 items-center justify-center border border-black/80 bg-transparent px-6 text-[11px] font-bold tracking-[0.08em] text-black uppercase transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2"
              >
                Explorar marketplace
              </Link>
            </div>

            <div className="mt-8 grid max-w-[700px] gap-3 sm:grid-cols-3">
              <div className="border border-black/10 bg-white/70 p-4 shadow-[0_16px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Tip rápido
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Revisá si el enlace quedó incompleto al copiarlo.
                </p>
              </div>
              <div className="border border-black/10 bg-black px-4 py-5 text-white shadow-[0_18px_30px_rgba(15,23,42,0.14)]">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-white/70 uppercase">
                  Mejor ruta
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Si buscabas un negocio, el marketplace es la forma más rápida de volver a ubicarlo.
                </p>
              </div>
              <div className="border border-black/10 bg-biz-yellow/70 p-4 shadow-[0_16px_26px_rgba(15,23,42,0.05)]">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-black/70 uppercase">
                  Estado
                </p>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  La plataforma sigue funcionando; solo se perdió esta URL.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-3 top-8 hidden h-20 w-20 rotate-[-8deg] border border-black bg-white px-3 py-2 shadow-[0_16px_28px_rgba(15,23,42,0.08)] lg:block">
              <p className="font-bebas text-[2.5rem] leading-none tracking-[0.02em] text-biz-barbie-pink">
                404
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Link extraviado
              </p>
            </div>

            <div className="relative overflow-hidden border border-black/10 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.12)]">
              <div className="grid gap-0 md:grid-cols-[0.92fr_1.08fr]">
                <div className="relative min-h-[320px] bg-[#ffd5e8]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(250,255,54,0.42),rgba(250,255,54,0)_36%),radial-gradient(circle_at_80%_20%,rgba(6,180,227,0.28),rgba(6,180,227,0)_34%)]" />
                  <div className="relative mx-auto flex h-full w-full max-w-[320px] items-end justify-center px-6 pt-10">
                    <Image
                      src="/assets/priconpri/mascot.webp"
                      alt="Mascota de PriConPri"
                      width={640}
                      height={840}
                      sizes="(min-width: 1024px) 320px, 75vw"
                      className="h-auto w-full max-w-[260px] object-contain drop-shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                      Página no encontrada
                    </p>
                    <h2 className="mt-3 max-w-[12ch] font-business-display text-[clamp(2.6rem,7vw,4.6rem)] leading-[0.88] font-black uppercase tracking-[-0.03em]">
                      REAGENDÁ
                      <br />
                      TU RECORRIDO
                    </h2>
                    <p className="mt-4 max-w-[34ch] text-sm leading-7 text-slate-700 sm:text-[15px]">
                      Diseñamos esta pausa para que no te frene: mantené el impulso con accesos
                      directos claros, visuales de marca y un camino simple de regreso.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Link
                      href="/negocios"
                      className="flex items-center justify-between border border-black bg-white px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Para negocios
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-black">
                          Conocer la propuesta de PriConPri
                        </span>
                      </span>
                      <span className="font-bebas text-2xl text-biz-barbie-pink">01</span>
                    </Link>

                    <Link
                      href="/contact"
                      className="flex items-center justify-between border border-black/10 bg-[#f6f7fb] px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                          Necesitás ayuda
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-black">
                          Ir a contacto y soporte
                        </span>
                      </span>
                      <span className="font-bebas text-2xl text-biz-sky-surge">02</span>
                    </Link>
                  </div>

                  <div className="border-t border-black/10 pt-5">
                    <Image
                      src="/assets/priconpri/wordmark-stacked.webp"
                      alt="PRICONPRI"
                      width={600}
                      height={370}
                      className="h-16 w-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
