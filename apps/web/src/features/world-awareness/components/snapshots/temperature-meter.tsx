const NEUTRAL_THRESHOLD = 0.15;

function bandClass(value: number): string {
  if (value > NEUTRAL_THRESHOLD) return "bg-positive";
  if (value < -NEUTRAL_THRESHOLD) return "bg-negative";
  return "bg-muted-foreground";
}

interface TemperatureMeterProps {
  value: number;
}

export function TemperatureMeter({ value }: TemperatureMeterProps) {
  const clamped = Math.max(-1, Math.min(1, value));
  const magnitudePct = Math.abs(clamped) * 50;
  const anchorSide = clamped >= 0 ? "left" : "right";

  return (
    <div
      className="relative h-1.5 w-full rounded-full bg-muted"
      role="meter"
      aria-valuenow={clamped}
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-border-strong" aria-hidden="true" />
      <div
        className={`absolute inset-y-0 rounded-full ${bandClass(clamped)}`}
        style={{ width: `${magnitudePct}%`, [anchorSide]: "50%" }}
      />
    </div>
  );
}
