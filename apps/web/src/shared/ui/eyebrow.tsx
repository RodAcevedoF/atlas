import { cn } from "@atlas/ui";
import { type VariantProps, cva } from "class-variance-authority";
import type { ReactNode } from "react";

/**
 * Small uppercase label that titles a card, a section inside one, or a column heading.
 *
 * `variant` names a size/tracking/face triple rather than exposing them separately — the scale is
 * typographic, not a free grid. Reach for `eyebrowVariants` when the type belongs to an element
 * that is not itself a label, e.g. a wrapper whose own layout classes carry it.
 */
export const eyebrowVariants = cva("uppercase", {
  variants: {
    variant: {
      card: "font-mono text-[9px] tracking-[0.16em]",
      section: "text-[10px] tracking-[0.13em]",
      header: "text-[10.5px] tracking-[0.14em]",
      meta: "font-mono text-[10.5px] tracking-[0.14em]",
    },
    tone: {
      muted: "text-muted-foreground",
      faint: "text-faint",
    },
  },
  defaultVariants: {
    variant: "card",
    tone: "muted",
  },
});

interface EyebrowProps extends VariantProps<typeof eyebrowVariants> {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className, variant, tone }: EyebrowProps) {
  return <span className={cn(eyebrowVariants({ variant, tone }), className)}>{children}</span>;
}
