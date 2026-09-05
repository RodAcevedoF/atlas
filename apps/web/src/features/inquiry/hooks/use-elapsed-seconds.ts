import { useEffect, useState } from "react";

export function useElapsedSeconds(isCounting: boolean): number {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isCounting) return;
    setElapsedSeconds(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1_000);
    return () => clearInterval(timer);
  }, [isCounting]);

  return elapsedSeconds;
}
