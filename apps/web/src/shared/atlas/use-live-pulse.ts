import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.ts";

export interface LivePulse {
  coverage: number;
  conviction: number;
  scanCount: number;
  hotCells: number[];
}

interface LivePulseOptions {
  intervalMs?: number;
  cellCount?: number;
}

const INITIAL: LivePulse = { coverage: 71, conviction: 44, scanCount: 4128, hotCells: [4, 19, 33] };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const drift = (spread: number) => Math.round((Math.random() - 0.5) * spread);

export function useLivePulse({
  intervalMs = 1500,
  cellCount = 54,
}: LivePulseOptions = {}): LivePulse {
  const reducedMotion = useReducedMotion();
  const [pulse, setPulse] = useState<LivePulse>(INITIAL);

  useEffect(() => {
    if (reducedMotion) {
      setPulse({ ...INITIAL, hotCells: [] });
      return;
    }
    const timer = setInterval(() => {
      setPulse((previous) => ({
        coverage: clamp(previous.coverage + drift(6), 40, 98),
        conviction: clamp(previous.conviction + drift(7), 12, 92),
        scanCount: previous.scanCount + Math.floor(Math.random() * 4),
        hotCells: [0, 1, 2].map(() => Math.floor(Math.random() * cellCount)),
      }));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [reducedMotion, intervalMs, cellCount]);

  return pulse;
}
