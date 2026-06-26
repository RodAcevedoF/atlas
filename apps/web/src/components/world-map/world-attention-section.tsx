import { useMemo, useState } from "react";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../repositories/market-repository.ts";
import { RegionDetailPanel } from "./region-detail-panel.tsx";
import { WorldMap } from "./world-map.tsx";

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

function leaderRegion(breakdowns: RegionTopicBreakdownRecord[]): GeoRegion | null {
  const leader = [...breakdowns].sort((left, right) => right.signalCount - left.signalCount)[0];
  return leader?.region ?? null;
}

export function WorldAttentionSection({
  breakdowns,
}: {
  breakdowns: RegionTopicBreakdownRecord[];
}) {
  const byRegion = useMemo(() => indexByRegion(breakdowns), [breakdowns]);
  const peak = useMemo(
    () => breakdowns.reduce((max, breakdown) => Math.max(max, breakdown.signalCount), 0),
    [breakdowns],
  );
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);

  const active = selectedRegion ?? leaderRegion(breakdowns);

  return (
    <>
      <WorldMap byRegion={byRegion} peak={peak} selected={active} onSelect={setSelectedRegion} />
      <RegionDetailPanel region={active} breakdown={active ? byRegion.get(active) : undefined} />
    </>
  );
}
