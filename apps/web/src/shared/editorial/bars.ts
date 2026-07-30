export type MotionLevel = "lively" | "calm";

export interface BreatheBar {
  id: string;
  heightPct: number;
  fill: string;
  durationSec: number;
  delaySec: number;
}

const COVERAGE_FILL = "color-mix(in srgb, var(--coverage) 66%, transparent)";
const CONVICTION_FILL = "color-mix(in srgb, var(--conviction) 66%, transparent)";

/**
 * Deterministic coverage×conviction waveform for the editorial "breathe" bars.
 * Pure (seeded by index only) so callers can memoize on `count`/`motion` alone.
 */
export function generateBreatheBars(count: number, motion: MotionLevel = "lively"): BreatheBar[] {
  const speedMultiplier = motion === "calm" ? 1.8 : 1;
  const bars: BreatheBar[] = [];
  for (let index = 0; index < count; index++) {
    const primaryWave = Math.sin(index * 0.41) * 0.5 + 0.5;
    const secondaryWave = Math.sin(index * 0.17 + 1.9) * 0.5 + 0.5;
    const isCoverage = primaryWave > secondaryWave;
    bars.push({
      id: `bar-${index}`,
      heightPct: Math.round(14 + (isCoverage ? primaryWave : secondaryWave) * 86),
      fill: isCoverage ? COVERAGE_FILL : CONVICTION_FILL,
      durationSec: Number(((3.0 + secondaryWave * 3.6) * speedMultiplier).toFixed(2)),
      delaySec: Number((index * 0.06).toFixed(2)),
    });
  }
  return bars;
}
