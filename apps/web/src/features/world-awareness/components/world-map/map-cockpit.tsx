import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  GeoRegion,
  MarketRecord,
  RegionTopicBreakdownRecord,
  Topic,
  WorldEventRecord,
} from "../../repositories/market-repository.ts";
import { deriveRegionCross } from "../../utils/index.ts";
import { FloatingPanel } from "./floating-panel.tsx";
import { RegionDetailPanel } from "./region-detail-panel.tsx";
import { WorldMap } from "./world-map.tsx";

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

interface MapCockpitProps {
  worldTopics: RegionTopicBreakdownRecord[];
  worldEvents: WorldEventRecord[];
  markets: MarketRecord[];
  topic: Topic | "";
}

export function MapCockpit({ worldTopics, worldEvents, markets, topic }: MapCockpitProps) {
  const navigate = useNavigate();
  const byRegion = useMemo(() => indexByRegion(worldTopics), [worldTopics]);
  const peak = useMemo(
    () => worldTopics.reduce((max, breakdown) => Math.max(max, breakdown.signalCount), 0),
    [worldTopics],
  );
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);

  const cross = useMemo(
    () => (selectedRegion ? deriveRegionCross(selectedRegion, topic, markets, worldEvents) : null),
    [selectedRegion, topic, markets, worldEvents],
  );

  const clearSelection = useCallback(() => setSelectedRegion(null), []);

  const openScan = useCallback(() => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (selectedRegion) params.set("region", selectedRegion);
    const query = params.toString();
    navigate(query ? `/intelligence?${query}` : "/intelligence");
  }, [selectedRegion, topic, navigate]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedRegion(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
      <div className="absolute inset-0">
        <WorldMap
          byRegion={byRegion}
          peak={peak}
          selected={selectedRegion}
          onSelect={setSelectedRegion}
          onClearSelection={clearSelection}
        />
      </div>

      <FloatingPanel
        visible={selectedRegion !== null}
        onClose={clearSelection}
        label="region detail"
        className="left-4 top-4"
      >
        <RegionDetailPanel
          region={selectedRegion}
          breakdown={selectedRegion ? byRegion.get(selectedRegion) : undefined}
          cross={cross}
          onOpenScan={openScan}
        />
      </FloatingPanel>
    </div>
  );
}
