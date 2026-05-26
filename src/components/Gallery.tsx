import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import galerie1 from "@/assets/galerie_1.webp";
import galerie2 from "@/assets/galeri_2.webp";
import galerie3 from "@/assets/galerie_3.webp";
import galerie4 from "@/assets/galerie_4.webp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = { src: string; alt: string };

const ITEMS: Item[] = [
  { src: galerie1, alt: "Střih a styling" },
  { src: galerie2, alt: "Úprava vousů" },
  { src: galerie3, alt: "Interiér barbershopu" },
  { src: galerie4, alt: "Barber řemeslo" },
];

export function Gallery() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: true,
    dragFree: false,
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((n) => (n === null ? 0 : (n + 1) % ITEMS.length));
      if (e.key === "ArrowLeft")
        setLightbox((n) => (n === null ? 0 : (n - 1 + ITEMS.length) % ITEMS.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  return (
    <section id="galerie" className="py-28 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px w-10 bg-gold" />
            <span className="text-xs uppercase tracking-[0.4em] text-gold">Lookbook</span>
            <span className="h-px w-10 bg-gold" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-foreground">
            <span className="gold-text-gradient">Galerie</span> řemesla
          </h2>
          <p className="mt-5 text-muted-foreground">
            Pohled do našeho světa — posuňte doleva nebo doprava, nebo klepněte na fotku.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden touch-pan-y" ref={emblaRef}>
            <div className="flex">
              {ITEMS.map((item, i) => (
                <div
                  key={item.src}
                  className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_70%] md:flex-[0_0_55%] px-4 sm:px-6"
                >
                  <button
                    type="button"
                    onClick={() => setLightbox(i)}
                    className="group flex flex-col items-center gap-4 w-full focus:outline-none mx-auto"
                  >
                    <div
                      className={cn(
                        "relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full overflow-hidden border-4 transition-all duration-500 shadow-luxe",
                        selectedIndex === i
                          ? "border-gold scale-105"
                          : "border-border opacity-80 scale-95 group-hover:border-gold/70",
                      )}
                    >
                      <img
                        src={item.src}
                        alt={item.alt}
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-widest transition-colors",
                        selectedIndex === i ? "text-gold" : "text-muted-foreground",
                      )}
                    >
                      {item.alt}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex border-gold/40 hover:border-gold"
            onClick={scrollPrev}
            aria-label="Předchozí fotka"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex border-gold/40 hover:border-gold"
            onClick={scrollNext}
            aria-label="Další fotka"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="flex justify-center gap-2 mt-8">
            {ITEMS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  selectedIndex === i ? "w-6 bg-gold" : "w-2 bg-muted-foreground/40",
                )}
                aria-label={`Fotka ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-5 right-5 w-11 h-11 rounded-full border border-border hover:border-gold flex items-center justify-center text-foreground transition-colors"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((n) => (n! - 1 + ITEMS.length) % ITEMS.length);
            }}
            className="absolute left-3 md:left-8 w-11 h-11 rounded-full border border-border hover:border-gold flex items-center justify-center text-foreground"
            aria-label="Předchozí"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((n) => (n! + 1) % ITEMS.length);
            }}
            className="absolute right-3 md:right-8 w-11 h-11 rounded-full border border-border hover:border-gold flex items-center justify-center text-foreground"
            aria-label="Další"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <img
            src={ITEMS[lightbox].src}
            alt={ITEMS[lightbox].alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] object-contain rounded-full border-4 border-gold/30 shadow-luxe animate-scale-in"
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-muted-foreground">
            {ITEMS[lightbox].alt} · {lightbox + 1} / {ITEMS.length}
          </div>
        </div>
      )}
    </section>
  );
}
