import { type Carousel, CarouselDots, type LivePulse } from "@/shared/brand";
import { eyebrowVariants } from "@/shared/ui";
import { cn } from "@atlas/ui";
import type { CSSProperties } from "react";
import { SLIDES, type SlideKind } from "../data/landing-content.ts";
import { SlideCopy } from "./slide-copy.tsx";
import { ArtifactCard } from "./visuals/artifact-card.tsx";
import { PlaceTable } from "./visuals/place-table.tsx";
import { PremiseWaves } from "./visuals/premise-waves.tsx";
import { ScanGrid } from "./visuals/scan-grid.tsx";

const SLIDE_LABEL_CLASS = cn(
  eyebrowVariants({ variant: "header" }),
  "absolute bottom-7 left-7 flex items-center gap-3 text-faint md:left-14",
);

interface Cta {
  label: string;
  href: string;
}

interface HeroCarouselProps {
  carousel: Carousel;
  pulse: LivePulse;
  primary: Cta;
  secondary?: Cta;
}

const SLIDE_IDS = SLIDES.map((slide) => slide.kind);
const pad2 = (value: number) => String(value).padStart(2, "0");

function SlideVisual({ kind, pulse }: { kind: SlideKind; pulse: LivePulse }) {
  switch (kind) {
    case "premise":
      return <PremiseWaves coverage={pulse.coverage} located={pulse.located} />;
    case "question":
      return <PlaceTable />;
    case "artifact":
      return <ArtifactCard />;
    case "live":
      return <ScanGrid scanCount={pulse.scanCount} hotCells={pulse.hotCells} />;
  }
}

export function HeroCarousel({ carousel, pulse, primary, secondary }: HeroCarouselProps) {
  const { index, tick, go, hoverProps } = carousel;
  const slide = SLIDES[index];
  const slideNo = `${pad2(index + 1)} / ${pad2(SLIDES.length)}`;

  return (
    <div
      onMouseEnter={hoverProps.onMouseEnter}
      onMouseLeave={hoverProps.onMouseLeave}
      className="group atlas4-panel relative h-[74vh] min-h-140 w-full max-w-280 overflow-hidden rounded-[22px]"
    >
      <div
        className="absolute inset-0 transition-[background] duration-1100 ease-out"
        style={{ background: slide.glow } as CSSProperties}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atlas4-scan atlas4-scan-line absolute left-0 top-0 h-px w-[30%]" />
      </div>

      <div className="absolute inset-0 grid grid-cols-1 items-center gap-x-13.5 px-7 pb-21 pt-14 md:grid-cols-2 md:px-14 md:pt-16.5">
        <div key={`copy-${tick}`} className="atlas4-reveal">
          <SlideCopy
            kicker={slide.kicker}
            titleLead={slide.titleLead}
            titleAccent={slide.titleAccent}
            body={slide.body}
            primary={primary}
            secondary={secondary}
          />
        </div>
        <div key={`visual-${tick}`} className="atlas4-reveal hidden h-full items-center md:flex">
          <SlideVisual kind={slide.kind} pulse={pulse} />
        </div>
      </div>

      <div className={SLIDE_LABEL_CLASS}>
        <span className="font-mono tabular-nums">{slideNo}</span>
        <span className="h-px w-6.5 bg-foreground/20" />
        <span>{slide.label}</span>
      </div>

      <CarouselDots
        ids={SLIDE_IDS}
        activeIndex={index}
        onSelect={go}
        className="absolute bottom-7 right-7 md:right-14"
      />
    </div>
  );
}
