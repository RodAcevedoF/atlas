import { WaveMeter, buildWave, useReducedMotion } from "@/shared/brand";
import { useMemo } from "react";

interface PremiseWavesProps {
  coverage: number;
  located: number;
}

export function PremiseWaves({ coverage, located }: PremiseWavesProps) {
  const reducedMotion = useReducedMotion();
  const coverageBars = useMemo(
    () => buildWave({ seed: 0.41, phase: 0, count: 30, motionless: reducedMotion }),
    [reducedMotion],
  );
  const locatedBars = useMemo(
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
          label="Located claims"
          value={located}
          bars={locatedBars}
          trackClassName="h-23"
        />
      </div>
    </div>
  );
}
