"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/lib/i18n";

type CardSeed = {
  key: string;
  accentClass: string;
  backgroundImage: string;
};

const typingWordKeys = [
  "businessTypes.typingWords.estetica",
  "businessTypes.typingWords.wellness",
  "businessTypes.typingWords.salud",
  "businessTypes.typingWords.fitness",
  "businessTypes.typingWords.spas",
  "businessTypes.typingWords.unas",
  "businessTypes.typingWords.masajes",
  "businessTypes.typingWords.tattoo",
  "businessTypes.typingWords.cejas",
  "businessTypes.typingWords.pestanas",
  "businessTypes.typingWords.nutrition",
  "businessTypes.typingWords.barbering",
] as const;

const cardSeeds: CardSeed[] = [
  {
    key: "businessTypes.cards.estetica",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage: "url('/assets/priconpri/negocios cards/aesthetics.png')",
  },
  {
    key: "businessTypes.cards.wellness",
    accentClass: "bg-biz-blush-rose",
    backgroundImage: "url('/assets/priconpri/negocios cards/wellness.png')",
  },
  {
    key: "businessTypes.cards.salud",
    accentClass: "bg-biz-blush-rose",
    backgroundImage: "url('/assets/priconpri/negocios cards/health.png')",
  },
  {
    key: "businessTypes.cards.fitness",
    accentClass: "bg-biz-sky-surge",
    backgroundImage: "url('/assets/priconpri/negocios cards/fitness.png')",
  },
  {
    key: "businessTypes.cards.spas",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage: "url('/assets/priconpri/negocios cards/recovery.png')",
  },
  {
    key: "businessTypes.cards.unas",
    accentClass: "bg-biz-yellow",
    backgroundImage: "url('/assets/priconpri/negocios cards/performance.png')",
  },
  {
    key: "businessTypes.cards.masajes",
    accentClass: "bg-biz-sky-surge",
    backgroundImage: "url('/assets/priconpri/negocios cards/beauty.png')",
  },
  {
    key: "businessTypes.cards.tattoo",
    accentClass: "bg-biz-sky-surge",
    backgroundImage: "url('/assets/priconpri/negocios cards/skincare.png')",
  },
  {
    key: "businessTypes.cards.cejas",
    accentClass: "bg-biz-barbie-pink",
    backgroundImage: "url('/assets/priconpri/negocios cards/movement.png')",
  },
  {
    key: "businessTypes.cards.pestanas",
    accentClass: "bg-biz-yellow",
    backgroundImage: "url('/assets/priconpri/negocios cards/care.png')",
  },
  {
    key: "businessTypes.cards.nutrition",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage: "url('/assets/priconpri/negocios cards/nutrition.png')",
  },
  {
    key: "businessTypes.cards.barbering",
    accentClass: "bg-biz-sky-surge",
    backgroundImage: "url('/assets/priconpri/negocios cards/barbering.png')",
  },
];

const getPartialWord = (word: string, size: number) =>
  Array.from(word).slice(0, Math.max(0, size)).join("");

export function BusinessTypesSection() {
  const t = useT();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [typingWordIndex, setTypingWordIndex] = useState(0);
  const [typingSize, setTypingSize] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const typingWords = useMemo(
    () => typingWordKeys.map((wordKey) => t(wordKey)),
    [t],
  );
  const typingSignature = typingWords.join("|");

  const cards = useMemo(
    () =>
      cardSeeds.map((seed) => ({
        ...seed,
        label: t(seed.key),
      })),
    [t],
  );

  const cardsForLoop = useMemo(() => [...cards, ...cards], [cards]);

  const maxTypingWordLength = useMemo(
    () => typingWords.reduce((max, word) => Math.max(max, Array.from(word).length), 0),
    [typingWords],
  );

  const currentTypingWord = typingWords[typingWordIndex] ?? "";
  const typedWord = getPartialWord(currentTypingWord, typingSize);

  useEffect(() => {
    setTypingWordIndex(0);
    setTypingSize(0);
    setIsDeleting(false);
  }, [typingSignature]);

  useEffect(() => {
    if (!typingWords.length) return;

    const activeWord = typingWords[typingWordIndex] ?? "";
    const activeWordSize = Array.from(activeWord).length;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (!isDeleting && typingSize < activeWordSize) {
      timeoutId = setTimeout(() => setTypingSize((prev) => prev + 1), 62);
    } else if (!isDeleting && typingSize === activeWordSize) {
      timeoutId = setTimeout(() => setIsDeleting(true), 820);
    } else if (isDeleting && typingSize > 0) {
      timeoutId = setTimeout(() => setTypingSize((prev) => prev - 1), 38);
    } else if (isDeleting && typingSize === 0) {
      setIsDeleting(false);
      setTypingWordIndex((prev) => (prev + 1) % typingWords.length);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isDeleting, typingSize, typingWordIndex, typingWords]);

  const getCarouselMetrics = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return null;

    const children = Array.from(
      container.querySelectorAll<HTMLElement>("[data-business-card]"),
    );

    if (children.length < cards.length + 1) return null;

    const firstCard = children[0];
    const secondCard = children[1] ?? firstCard;
    const step = secondCard.offsetLeft - firstCard.offsetLeft || firstCard.offsetWidth + 16;
    const loopOffset = children[cards.length].offsetLeft;

    return { container, step, loopOffset };
  }, [cards.length]);

  const scrollCarousel = useCallback(
    (direction: 1 | -1) => {
      const metrics = getCarouselMetrics();
      if (!metrics) return;

      const { container, step, loopOffset } = metrics;

      if (direction < 0 && container.scrollLeft <= step * 0.65) {
        container.scrollLeft += loopOffset;
      }

      if (direction > 0 && container.scrollLeft >= loopOffset + step * 0.65) {
        container.scrollLeft -= loopOffset;
      }

      container.scrollBy({
        left: direction * step,
        behavior: "smooth",
      });

      window.setTimeout(() => {
        const afterMetrics = getCarouselMetrics();
        if (!afterMetrics) return;
        const {
          container: updatedContainer,
          step: updatedStep,
          loopOffset: updatedLoopOffset,
        } = afterMetrics;

        if (updatedContainer.scrollLeft >= updatedLoopOffset + updatedStep * 0.65) {
          updatedContainer.scrollLeft -= updatedLoopOffset;
        }
        if (updatedContainer.scrollLeft <= updatedStep * 0.4) {
          updatedContainer.scrollLeft += updatedLoopOffset;
        }
      }, 420);
    },
    [getCarouselMetrics],
  );

  useEffect(() => {
    const metrics = getCarouselMetrics();
    if (!metrics) return;
    metrics.container.scrollLeft = metrics.loopOffset;
  }, [getCarouselMetrics]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isPaused) return;
      scrollCarousel(1);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [isPaused, scrollCarousel]);

  return (
    <section id="sectores" className="bg-white py-16 sm:py-20 lg:py-24 scroll-mt-20" aria-labelledby="business-types-heading">
      <div className="mx-auto w-full max-w-[1380px] px-6 lg:px-12">
        <h2
          id="business-types-heading"
          className="max-w-[1120px] font-business-display text-[clamp(3.2rem,8.1vw,7rem)] leading-[0.83] font-black uppercase tracking-[-0.02em] text-biz-heading-dark"
        >
          <span className="block">{t("businessTypes.line1")}</span>
          <span className="block">{t("businessTypes.line2")}</span>
          <span className="block">
            <span
              className="inline-block align-top"
              style={{ minWidth: `${maxTypingWordLength + 0.8}ch` }}
            >
              {typedWord}
            </span>
          </span>
        </h2>

        <div className="relative mt-12 sm:mt-14">
          <button
            type="button"
            onClick={() => scrollCarousel(-1)}
            aria-label={t("businessTypes.previousSlide")}
            className="absolute left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/70 bg-white/80 text-slate-800 shadow-sm backdrop-blur transition hover:bg-white lg:flex xl:left-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={carouselRef}
            aria-label={t("businessTypes.carouselAria")}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
          >
            {cardsForLoop.map((card, index) => (
              <article
                key={`${card.key}-${index}`}
                data-business-card
                className="group relative aspect-square w-[72vw] max-w-[260px] min-w-[170px] snap-start overflow-hidden border border-slate-200 transition-transform duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_18px_38px_rgba(15,23,42,0.22)] sm:w-[42vw] sm:min-w-[186px] md:w-[30vw] lg:max-w-[228px] lg:min-w-[228px] xl:max-w-[238px] 2xl:w-[15.1vw] 2xl:min-w-[238px]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 ease-out"
                  style={{ backgroundImage: card.backgroundImage }}
                />

                <div className="absolute inset-x-3 bottom-3 z-10">
                  <span className={`mb-2 block h-[3px] w-6 ${card.accentClass}`} />
                  <h3 className="font-bebas text-[clamp(1.45rem,2vw,2.15rem)] leading-none font-semibold tracking-tight text-white">
                    {card.label}
                  </h3>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            aria-label={t("businessTypes.nextSlide")}
            className="absolute right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/70 bg-white/80 text-slate-800 shadow-sm backdrop-blur transition hover:bg-white lg:flex xl:right-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
