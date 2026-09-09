import { eyebrowVariants } from "@/shared/ui/index.ts";
import { cn } from "@atlas/ui";
import { memo } from "react";
import { RESEARCH_FEATURES } from "./atlas-facts.ts";

const STRIP_CLASS = cn(
  "flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-9",
  eyebrowVariants({ variant: "meta" }),
);

interface SourceStripProps {
  trailing?: string;
  className?: string;
}

export const SourceStrip = memo(function SourceStrip({ trailing, className }: SourceStripProps) {
  return (
    <div className={cn(STRIP_CLASS, className)}>
      {RESEARCH_FEATURES.map((source) => (
        <span key={source}>{source}</span>
      ))}
      {trailing ? <span>{trailing}</span> : null}
    </div>
  );
});
