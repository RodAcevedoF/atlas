import { cn } from "@atlas/ui";
import { type VariantProps, cva } from "class-variance-authority";
import type { ReactNode } from "react";

export const eyebrowVariants = cva("uppercase", {
  variants: {
    variant: {
      card: "font-mono text-[9px] tracking-[0.16em] text-muted-foreground",
      header: "text-[10.5px] tracking-[0.14em] text-muted-foreground",
      meta: "font-mono text-[10.5px] tracking-[0.14em] text-faint",
    },
  },
  defaultVariants: {
    variant: "card",
  },
});

interface EyebrowProps extends VariantProps<typeof eyebrowVariants> {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className, variant }: EyebrowProps) {
  return <span className={cn(eyebrowVariants({ variant }), className)}>{children}</span>;
}
