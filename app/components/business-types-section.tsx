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
  "businessTypes.typingWords.spas",
  "businessTypes.typingWords.unas",
  "businessTypes.typingWords.wellness",
  "businessTypes.typingWords.masajes",
  "businessTypes.typingWords.estetica",
  "businessTypes.typingWords.tattoo",
  "businessTypes.typingWords.cejas",
  "businessTypes.typingWords.pestanas",
  "businessTypes.typingWords.makeup",
  "businessTypes.typingWords.fisioterapia",
] as const;

const cardSeeds: CardSeed[] = [
  {
    key: "businessTypes.cards.barberias",
    accentClass: "bg-biz-sky-surge",
    backgroundImage:
      "linear-gradient(165deg, #1b1e24 2%, #4d5158 52%, #16181d 98%)",
  },
  {
    key: "businessTypes.cards.salones",
    accentClass: "bg-biz-barbie-pink",
    backgroundImage:
      "linear-gradient(150deg, #2b2d31 5%, #72767e 50%, #2a2d31 96%)",
  },
  {
    key: "businessTypes.cards.spas",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage:
      "linear-gradient(160deg, #54585e 1%, #9ca1a8 50%, #5f646b 100%)",
  },
  {
    key: "businessTypes.cards.unas",
    accentClass: "bg-biz-yellow",
    backgroundImage:
      "linear-gradient(165deg, #252830 0%, #5e636d 52%, #1f2229 100%)",
  },
  {
    key: "businessTypes.cards.wellness",
    accentClass: "bg-biz-blush-rose",
    backgroundImage:
      "linear-gradient(160deg, #2c2f36 2%, #70757f 48%, #2a2d34 98%)",
  },
  {
    key: "businessTypes.cards.masajes",
    accentClass: "bg-biz-sky-surge",
    backgroundImage:
      "linear-gradient(160deg, #33363d 3%, #7b808a 50%, #343740 97%)",
  },
  {
    key: "businessTypes.cards.cejas",
    accentClass: "bg-biz-barbie-pink",
    backgroundImage:
      "linear-gradient(160deg, #2f333a 0%, #7a7f88 53%, #2d3139 100%)",
  },
  {
    key: "businessTypes.cards.pestanas",
    accentClass: "bg-biz-yellow",
    backgroundImage:
      "linear-gradient(155deg, #292d34 0%, #6f7480 48%, #23272f 100%)",
  },
  {
    key: "businessTypes.cards.makeup",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage:
      "linear-gradient(156deg, #32363e 0%, #7c828d 49%, #2b2f38 100%)",
  },
  {
    key: "businessTypes.cards.tattoo",
    accentClass: "bg-biz-sky-surge",
    backgroundImage:
      "linear-gradient(160deg, #2a2e34 0%, #6f7480 50%, #242830 100%)",
  },
  {
    key: "businessTypes.cards.skincare",
    accentClass: "bg-biz-barbie-pink",
    backgroundImage:
      "linear-gradient(165deg, #2e3239 0%, #797e88 48%, #272b33 100%)",
  },
  {
    key: "businessTypes.cards.depilacion",
    accentClass: "bg-biz-yellow",
    backgroundImage:
      "linear-gradient(165deg, #2b2f36 2%, #717682 51%, #252932 100%)",
  },
  {
    key: "businessTypes.cards.estetica",
    accentClass: "bg-biz-cherry-blossom",
    backgroundImage:
      "linear-gradient(160deg, #2f3339 0%, #787d87 50%, #2c3038 100%)",
  },
  {
    key: "businessTypes.cards.fisio",
    accentClass: "bg-biz-sky-surge",
    backgroundImage:
      "linear-gradient(165deg, #282c33 2%, #6f7580 51%, #252931 100%)",
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
                className="group relative h-[228px] w-[72vw] max-w-[260px] min-w-[170px] snap-start overflow-hidden border border-slate-200 transition-transform duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_18px_38px_rgba(15,23,42,0.22)] sm:w-[42vw] sm:min-w-[186px] md:w-[30vw] lg:h-[272px] lg:w-[19.6vw] lg:min-w-[228px] xl:h-[284px] xl:w-[17.1vw] xl:min-w-[238px] 2xl:w-[15.1vw] 2xl:min-w-[246px]"
              >
                <div
                  className="absolute inset-0 grayscale transition-all duration-500 ease-out group-hover:-translate-y-3 group-hover:scale-[1.04] group-hover:grayscale-0"
                  style={{ backgroundImage: card.backgroundImage }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_35%,rgba(0,0,0,0.25)_100%)] mix-blend-soft-light" />
                <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.07)_0px,rgba(255,255,255,0.07)_1px,transparent_1px,transparent_9px)] opacity-45" />
                <div className="absolute inset-0 bg-black/48 transition-colors duration-500 group-hover:bg-black/16" />

                <div className="absolute inset-x-3 bottom-3 z-10">
                  <span className={`mb-2 block h-[3px] w-6 ${card.accentClass}`} />
                  <h3 className="font-bebas text-[clamp(1.45rem,2vw,2.15rem)] leading-none font-semibold tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
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
