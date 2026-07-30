import { type RefObject, useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface InViewOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Reports once when `ref` first scrolls into view (drives reveal-on-scroll).
 * Reduced-motion reports `true` immediately so nothing stays hidden.
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { threshold = 0.2, rootMargin = "0px 0px -8% 0px" }: InViewOptions = {},
): boolean {
  const reducedMotion = useReducedMotion();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reducedMotion) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, reducedMotion]);

  return inView;
}
