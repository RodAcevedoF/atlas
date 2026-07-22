import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  GeoRegion,
  MarketRecord,
  RegionTopicBreakdownRecord,
  Topic,
  WorldEventRecord,
} from "../../repositories/market-repository.ts";
import { deriveRegionCross, marketCoverageKeys } from "../../utils/index.ts";
import { KpiStrip } from "../dashboard/kpi-strip.tsx";
import { WhatsHappening } from "../dashboard/whats-happening.tsx";
import { FloatingPanel } from "./floating-panel.tsx";
import { RegionDetailPanel } from "./region-detail-panel.tsx";
import type { PanelKey } from "./use-panel-visibility.ts";
import { WorldMap } from "./world-map.tsx";

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

function leaderRegion(breakdowns: RegionTopicBreakdownRecord[]): GeoRegion | null {
  const leader = [...breakdowns].sort((left, right) => right.signalCount - left.signalCount)[0];
  return leader?.region ?? null;
}

interface MapCockpitProps {
  worldTopics: RegionTopicBreakdownRecord[];
  worldEvents: WorldEventRecord[];
  markets: MarketRecord[];
  topic: Topic | "";
  totalVolumeUsd: number;
  worldSignals: number;
  activeTopics: number;
  regionsInFocus: number;
  isLoading: boolean;
  visibility: Record<PanelKey, boolean>;
  onHidePanel: (panel: PanelKey) => void;
}

export function MapCockpit({
  worldTopics,
  worldEvents,
  markets,
  topic,
  totalVolumeUsd,
  worldSignals,
  activeTopics,
  regionsInFocus,
  isLoading,
  visibility,
  onHidePanel,
}: MapCockpitProps) {
  const navigate = useNavigate();
  const byRegion = useMemo(() => indexByRegion(worldTopics), [worldTopics]);
  const peak = useMemo(
    () => worldTopics.reduce((max, breakdown) => Math.max(max, breakdown.signalCount), 0),
    [worldTopics],
  );
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const active = selectedRegion ?? leaderRegion(worldTopics);

  const cross = useMemo(
    () => (active ? deriveRegionCross(active, topic, markets, worldEvents) : null),
    [active, topic, markets, worldEvents],
  );
  const marketKeys = useMemo(() => marketCoverageKeys(markets), [markets]);

  const openScan = useCallback(() => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (active) params.set("region", active);
    const query = params.toString();
    navigate(query ? `/intelligence?${query}` : "/intelligence");
  }, [active, topic, navigate]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
      <div className="absolute inset-0">
        <WorldMap byRegion={byRegion} peak={peak} selected={active} onSelect={setSelectedRegion} />
      </div>

      <FloatingPanel
        visible={visibility.kpis}
        onClose={() => onHidePanel("kpis")}
        label="key metrics"
        className="left-4 top-4 w-135"
      >
        <KpiStrip
          worldSignals={worldSignals}
          activeTopics={activeTopics}
          regionsInFocus={regionsInFocus}
          totalVolumeUsd={totalVolumeUsd}
          isLoading={isLoading}
        />
      </FloatingPanel>

      <FloatingPanel
        visible={visibility.region}
        onClose={() => onHidePanel("region")}
        label="region detail"
        className="right-4 top-4 flex max-h-[clamp(260px,48vh,560px)]"
      >
        <RegionDetailPanel
          region={active}
          breakdown={active ? byRegion.get(active) : undefined}
          cross={cross}
          onOpenScan={openScan}
        />
      </FloatingPanel>

      <FloatingPanel
        visible={visibility.events}
        onClose={() => onHidePanel("events")}
        label="world events"
        className="bottom-4 right-4 flex h-[clamp(240px,44vh,480px)] w-135"
      >
        <WhatsHappening events={worldEvents} marketKeys={marketKeys} />
      </FloatingPanel>
    </div>
  );
}
