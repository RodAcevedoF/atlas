import { WaveMeter, buildWave, useReducedMotion } from "@/shared/atlas";
import { useMemo } from "react";

interface PremiseWavesProps {
  coverage: number;
  conviction: number;
}

export function PremiseWaves({ coverage, conviction }: PremiseWavesProps) {
  const reducedMotion = useReducedMotion();
  const coverageBars = useMemo(
    () => buildWave({ seed: 0.41, phase: 0, count: 30, motionless: reducedMotion }),
    [reducedMotion],
  );
  const convictionBars = useMemo(
    () => buildWave({ seed: 0.33, phase: 2.2, count: 30, motionless: reducedMotion }),
    [reducedMotion],
  );

  return (
    <div className="w-full">
      <WaveMeter
        variant="coverage"
        label="Coverage"
        value={coverage}
        bars={coverageBars}
        trackClassName="h-23"
      />
      <div className="mt-6.5">
        <WaveMeter
          variant="conviction"
          label="Conviction"
          value={conviction}
          bars={convictionBars}
          trackClassName="h-23"
        />
      </div>
    </div>
  );
}
