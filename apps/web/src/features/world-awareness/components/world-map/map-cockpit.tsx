import { ResearchAskBox } from "@/features/research/components/research-ask-box.tsx";
import type { ResearchRunRecord } from "@/features/research/repositories/research-repository.ts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TopicFilter } from "../../infra/store/dashboard.filters.ts";
import type {
  GeoRegion,
  MarketRecord,
  RegionTopicBreakdownRecord,
  WorldEventRecord,
} from "../../repositories/market-repository.ts";
import { deriveRegionCross } from "../../utils/index.ts";
import {
  AwarenessLegend,
  AwarenessRunNotice,
  AwarenessRunPill,
} from "./overlays/awareness-legend.tsx";
import { MapError } from "./overlays/map-error.tsx";
import { MapStats, type MapStatsValues } from "./overlays/map-stats.tsx";
import { TopicPicker } from "./overlays/topic-picker.tsx";
import { FloatingPanel } from "./panels/floating-panel.tsx";
import { PinDetail } from "./panels/pin-detail.tsx";
import { RegionDetailPanel } from "./panels/region-detail-panel.tsx";
import { selectAwarenessRun } from "./utils/awareness-run.ts";
import { countTopicSignals } from "./utils/topic-counts.ts";
import { WorldMap } from "./world-map.tsx";

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

interface MapCockpitProps {
  worldTopics: RegionTopicBreakdownRecord[];
  worldEvents: WorldEventRecord[];
  markets: MarketRecord[];
  topic: TopicFilter;
  onTopicChange: (topic: TopicFilter) => void;
  stats: MapStatsValues;
  researchRuns: ResearchRunRecord[];
  error: string | null;
}

export function MapCockpit({
  worldTopics,
  worldEvents,
  markets,
  topic,
  onTopicChange,
  stats,
  researchRuns,
  error,
}: MapCockpitProps) {
  const navigate = useNavigate();
  const byRegion = useMemo(() => indexByRegion(worldTopics), [worldTopics]);
  const awareness = useMemo(() => selectAwarenessRun(researchRuns), [researchRuns]);
  const [ambientForRunId, setAmbientForRunId] = useState<string | null>(null);
  const plotted = awareness.paint?.points.features.length ?? 0;
  const showsAmbient = awareness.run !== null && ambientForRunId === awareness.run.id;
  const paintsRun = plotted > 0 && !showsAmbient;
  const showsFallback = paintsRun && awareness.isFallback;
  const topicCounts = useMemo(() => countTopicSignals(worldTopics), [worldTopics]);
  const peak = useMemo(
    () => worldTopics.reduce((max, breakdown) => Math.max(max, breakdown.signalCount), 0),
    [worldTopics],
  );
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WorldEventRecord | null>(null);

  const cross = useMemo(
    () => (selectedRegion ? deriveRegionCross(selectedRegion, topic, markets, worldEvents) : null),
    [selectedRegion, topic, markets, worldEvents],
  );

  const relatedMarkets = useMemo(
    () =>
      selectedEvent
        ? deriveRegionCross(selectedEvent.primaryRegion, selectedEvent.topic, markets, worldEvents)
            .markets
        : [],
    [selectedEvent, markets, worldEvents],
  );

  const selectRegion = useCallback((region: GeoRegion) => {
    setSelectedEvent(null);
    setSelectedRegion(region);
  }, []);

  const selectEvent = useCallback((event: WorldEventRecord) => {
    setSelectedRegion(null);
    setSelectedEvent(event);
  }, []);

  const showAmbient = useCallback(() => setAmbientForRunId(awareness.run?.id ?? null), [awareness]);
  const showRun = useCallback(() => setAmbientForRunId(null), []);

  const clearRegion = useCallback(() => setSelectedRegion(null), []);
  const clearEvent = useCallback(() => setSelectedEvent(null), []);
  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSelectedEvent(null);
  }, []);

  const openScan = useCallback(() => {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (selectedRegion) params.set("region", selectedRegion);
    const query = params.toString();
    navigate(query ? `/intelligence?${query}` : "/intelligence");
  }, [selectedRegion, topic, navigate]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [clearSelection]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <WorldMap
          byRegion={byRegion}
          peak={peak}
          selected={selectedRegion}
          events={worldEvents}
          awareness={paintsRun && awareness.paint ? awareness.paint.points : null}
          onSelect={selectRegion}
          onSelectEvent={selectEvent}
          onClearSelection={clearSelection}
        />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex w-full max-w-[min(32rem,calc(100vw-36rem))] -translate-x-1/2 flex-col items-center gap-2 px-4">
        <div className="pointer-events-auto w-full">
          <ResearchAskBox />
        </div>
        {error ? <MapError message={error} /> : null}
        {awareness.latest && (plotted === 0 || showsFallback) ? (
          <AwarenessRunNotice latest={awareness.latest} isFallback={showsFallback} />
        ) : null}
      </div>

      {paintsRun && awareness.run && awareness.paint ? (
        <AwarenessLegend
          run={awareness.run}
          plotted={plotted}
          unmapped={awareness.paint.unmapped}
          onShowAmbient={showAmbient}
        />
      ) : null}

      {paintsRun ? null : (
        <>
          <TopicPicker topic={topic} counts={topicCounts} onTopicChange={onTopicChange} />
          <MapStats {...stats} />
          {awareness.run && plotted > 0 ? (
            <AwarenessRunPill run={awareness.run} onShowRun={showRun} />
          ) : null}
        </>
      )}

      <FloatingPanel
        visible={selectedRegion !== null}
        onClose={clearRegion}
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

      <FloatingPanel
        visible={selectedEvent !== null}
        onClose={clearEvent}
        label="event detail"
        className="left-4 top-4"
      >
        {selectedEvent ? <PinDetail event={selectedEvent} markets={relatedMarkets} /> : null}
      </FloatingPanel>
    </div>
  );
}
