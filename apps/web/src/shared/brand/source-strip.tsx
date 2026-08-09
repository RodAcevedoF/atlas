import { eyebrowVariants } from "@/shared/ui/index.ts";
import { cn } from "@atlas/ui";
import { memo } from "react";
import { WIRE_SOURCES } from "./atlas-facts.ts";

interface SourceStripProps {
  trailing?: string;
  className?: string;
}

export const SourceStrip = memo(function SourceStrip({ trailing, className }: SourceStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-9 gap-y-2",
        eyebrowVariants({ variant: "meta" }),
        className,
      )}
    >
      {WIRE_SOURCES.map((source) => (
        <span key={source}>{source}</span>
      ))}
      {trailing ? <span>{trailing}</span> : null}
    </div>
  );
});
