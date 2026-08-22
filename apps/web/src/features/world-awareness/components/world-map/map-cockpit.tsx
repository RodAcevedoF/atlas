import { ResearchAskBox } from "@/features/research/components/research-ask-box.tsx";
import type { ResearchRunSummaryRecord } from "@/features/research/repositories/research-repository.ts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAwarenessLayer } from "../../hooks/use-awareness-layer.ts";
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
  researchRuns: ResearchRunSummaryRecord[];
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const byRegion = useMemo(() => indexByRegion(worldTopics), [worldTopics]);
  const awareness = useAwarenessLayer(researchRuns, requestedRunId);
  const mapError = error ?? awareness.error;
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

  const clearRequestedRun = useCallback(() => {
    if (!requestedRunId) return;
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.delete("run");
        return params;
      },
      { replace: true },
    );
  }, [requestedRunId, setSearchParams]);

  const clearRegion = useCallback(() => setSelectedRegion(null), []);
  const clearEvent = useCallback(() => setSelectedEvent(null), []);
  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSelectedEvent(null);
  }, []);

  const openScan = useCallback(() => {
    const params = new URLSearchParams({ view: "scan" });
    if (topic) params.set("topic", topic);
    if (selectedRegion) params.set("region", selectedRegion);
    navigate(`/intelligence?${params.toString()}`);
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
          awareness={awareness.isPainting && awareness.paint ? awareness.paint.points : null}
          onSelect={selectRegion}
          onSelectEvent={selectEvent}
          onClearSelection={clearSelection}
        />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex w-full max-w-[min(32rem,calc(100vw-36rem))] -translate-x-1/2 flex-col items-center gap-2 px-4">
        <div className="pointer-events-auto w-full">
          <ResearchAskBox onAsk={clearRequestedRun} />
        </div>
        {mapError ? <MapError message={mapError} /> : null}
        {awareness.showsNotice && awareness.latest ? (
          <AwarenessRunNotice
            latest={awareness.latest}
            isFallback={awareness.isFallback}
            requestMiss={awareness.requestMiss}
            isPainting={awareness.isPainting}
          />
        ) : null}
      </div>

      {awareness.isPainting && awareness.detail && awareness.paint ? (
        <AwarenessLegend
          run={awareness.detail}
          plotted={awareness.plotted}
          unmapped={awareness.paint.unmapped}
          onShowAmbient={awareness.showAmbient}
        />
      ) : null}

      {awareness.isPainting ? null : (
        <>
          <TopicPicker topic={topic} counts={topicCounts} onTopicChange={onTopicChange} />
          <MapStats {...stats} />
          {awareness.run && awareness.plotted > 0 ? (
            <AwarenessRunPill run={awareness.run} onShowRun={awareness.showRun} />
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
