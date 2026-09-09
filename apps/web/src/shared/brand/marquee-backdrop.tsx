import { type CSSProperties, memo } from "react";

interface MarqueeBackdropProps {
  words: readonly string[];
  durationSec?: number;
}

export const MarqueeBackdrop = memo(function MarqueeBackdrop({
  words,
  durationSec = 68,
}: MarqueeBackdropProps) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="atlas4-marquee grid min-h-[200%] grid-rows-2"
        style={{ "--marquee-dur": `${durationSec}s` } as CSSProperties}
      >
        {["first", "repeat"].map((copy) => (
          <div key={copy} className="flex flex-col justify-around">
            {words.map((word) => (
              <div key={word} className="atlas4-marquee-word">
                {word}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 atlas4-vignette" />
      <div className="absolute inset-x-0 top-0 h-30 atlas4-fade-top" />
      <div className="absolute inset-x-0 bottom-0 h-35 atlas4-fade-bottom" />
    </div>
  );
});
