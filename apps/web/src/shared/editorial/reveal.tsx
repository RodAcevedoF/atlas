import { cn } from "@atlas/ui";
import { type ReactNode, useRef } from "react";
import { useInView } from "./use-in-view.ts";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** stagger, in ms, applied once the block enters view */
  delayMs?: number;
}

/** Fades + lifts its children into place the first time they scroll into view. */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView && delayMs > 0 ? `${delayMs}ms` : undefined }}
      className={cn(
        "transition-[opacity,transform] duration-1000 ease-[cubic-bezier(.2,.7,.2,1)]",
        inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
