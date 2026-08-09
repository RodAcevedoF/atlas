import { Eyebrow } from "@/shared/ui";

export interface MapStatsValues {
  signals: number;
  regions: number;
  topics: number;
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <Eyebrow className="block">{label}</Eyebrow>
      <div
        className={`mt-0.75 text-[17px] font-semibold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// Sits clear of the account avatar pinned at the bottom-right corner of the viewport.
export function MapStats({ signals, regions, topics }: MapStatsValues) {
  return (
    <div className="absolute bottom-4 right-16 z-5 flex gap-5.5 rounded-xl border border-border bg-card/80 px-4 py-2.75 backdrop-blur-md">
      <Stat label="Signals" value={signals} />
      <Stat label="Regions" value={regions} />
      <Stat label="Topics" value={topics} accent />
    </div>
  );
}
