import { type CSSProperties, memo } from "react";

interface MarqueeBackdropProps {
  words: readonly string[];
  durationSec?: number;
}

export const MarqueeBackdrop = memo(function MarqueeBackdrop({
  words,
  durationSec = 68,
}: MarqueeBackdropProps) {
  const loop = [...words, ...words];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="atlas4-marquee"
        style={{ "--marquee-dur": `${durationSec}s` } as CSSProperties}
      >
        {loop.map((word, index) => (
          <div key={`${word}-${index < words.length ? "a" : "b"}`} className="atlas4-marquee-word">
            {word}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 atlas4-vignette" />
      <div className="absolute inset-x-0 top-0 h-30 atlas4-fade-top" />
      <div className="absolute inset-x-0 bottom-0 h-35 atlas4-fade-bottom" />
    </div>
  );
});
