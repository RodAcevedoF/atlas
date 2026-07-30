export interface WaveBar {
  id: string;
  height: number;
  durationSec: number;
  delaySec: number;
}

interface WaveOptions {
  seed: number;
  phase: number;
  count?: number;
  motionless?: boolean;
}

export function buildWave({ seed, phase, count = 30, motionless = false }: WaveOptions): WaveBar[] {
  const bars: WaveBar[] = [];
  for (let index = 0; index < count; index++) {
    const primary = Math.sin(index * seed + phase) * 0.5 + 0.5;
    const secondary = Math.sin(index * 0.23 + phase * 1.7) * 0.5 + 0.5;
    bars.push({
      id: `wave-${seed}-${index}`,
      height: Math.round(18 + ((primary + secondary) / 2) * 82),
      durationSec: motionless ? 0 : Number((2.6 + secondary * 2.8).toFixed(2)),
      delaySec: motionless ? 0 : Number((index * 0.07).toFixed(2)),
    });
  }
  return bars;
}
