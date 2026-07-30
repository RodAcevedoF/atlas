import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface CarouselOptions {
  length: number;
  intervalMs?: number;
}

export interface Carousel {
  index: number;
  tick: number;
  isHovered: boolean;
  go: (next: number) => void;
  hoverProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

export function useCarousel({ length, intervalMs = 7000 }: CarouselOptions): Carousel {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const hoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const schedule = useCallback(() => {
    clearInterval(timerRef.current);
    if (reducedMotion) return;
    timerRef.current = setInterval(() => {
      if (hoveredRef.current) return;
      setIndex((previous) => (previous + 1) % length);
      setTick((previous) => previous + 1);
    }, intervalMs);
  }, [reducedMotion, length, intervalMs]);

  useEffect(() => {
    schedule();
    return () => clearInterval(timerRef.current);
  }, [schedule]);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % length) + length) % length);
      setTick((previous) => previous + 1);
      schedule();
    },
    [length, schedule],
  );

  const hoverProps = {
    onMouseEnter: () => {
      hoveredRef.current = true;
      setIsHovered(true);
    },
    onMouseLeave: () => {
      hoveredRef.current = false;
      setIsHovered(false);
    },
  };

  return { index, tick, isHovered, go, hoverProps };
}
