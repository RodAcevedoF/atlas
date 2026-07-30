import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion.ts";

interface TypewriterOptions {
  active?: boolean;
  stepMs?: number;
  charsPerStep?: number;
}

export function useTypewriter(
  text: string,
  { active = true, stepMs = 34, charsPerStep = 2 }: TypewriterOptions = {},
): string {
  const reducedMotion = useReducedMotion();
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (reducedMotion || !active) {
      setLength(text.length);
      return;
    }
    setLength(0);
    const timer = setInterval(() => {
      setLength((previous) => {
        const next = Math.min(text.length, previous + charsPerStep);
        if (next >= text.length) clearInterval(timer);
        return next;
      });
    }, stepMs);
    return () => clearInterval(timer);
  }, [text, active, stepMs, charsPerStep, reducedMotion]);

  return text.slice(0, length);
}
