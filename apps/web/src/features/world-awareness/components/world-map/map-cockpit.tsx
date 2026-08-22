import { InquiryAskBox, type InquiryRunSummaryRecord } from "@/features/inquiry";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAwarenessLayer } from "../../hooks/use-awareness-layer.ts";
import type { TopicFilter } from "../../infra/store/dashboard.filters.ts";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
  WorldEventRecord,
} from "../../repositories/world-repository.ts";
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
  topic: TopicFilter;
  onTopicChange: (topic: TopicFilter) => void;
  stats: MapStatsValues;
  inquiryRuns: InquiryRunSummaryRecord[];
  error: string | null;
}

export function MapCockpit({
  worldTopics,
  worldEvents,
  topic,
  onTopicChange,
  stats,
  inquiryRuns,
  error,
}: MapCockpitProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const byRegion = useMemo(() => indexByRegion(worldTopics), [worldTopics]);
  const awareness = useAwarenessLayer(inquiryRuns, requestedRunId);
  const mapError = error ?? awareness.error;
  const topicCounts = useMemo(() => countTopicSignals(worldTopics), [worldTopics]);
  const peak = useMemo(
    () => worldTopics.reduce((max, breakdown) => Math.max(max, breakdown.signalCount), 0),
    [worldTopics],
  );
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WorldEventRecord | null>(null);

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
          awareness={awareness.isPainting ? awareness.points : null}
          onSelect={selectRegion}
          onSelectEvent={selectEvent}
          onClearSelection={clearSelection}
        />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex w-full max-w-[22rem] -translate-x-1/2 flex-col items-center gap-2 px-4 lg:max-w-[min(32rem,calc(100vw-36rem))]">
        <div className="pointer-events-auto w-full">
          <InquiryAskBox onAsk={clearRequestedRun} />
        </div>
        {mapError ? <MapError message={mapError} /> : null}
        {awareness.showsNotice && awareness.latest ? (
          <AwarenessRunNotice
            latest={awareness.latest}
            isFallback={awareness.isFallback}
            requestMiss={awareness.requestMiss}
            isPainting={awareness.isPainting}
            onDismiss={awareness.dismissNotice}
          />
        ) : null}
      </div>

      {awareness.isPainting && awareness.detail ? (
        <AwarenessLegend
          run={awareness.detail}
          plotted={awareness.plotted}
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
        />
      </FloatingPanel>

      <FloatingPanel
        visible={selectedEvent !== null}
        onClose={clearEvent}
        label="event detail"
        className="left-4 top-4"
      >
        {selectedEvent ? <PinDetail event={selectedEvent} /> : null}
      </FloatingPanel>
    </div>
  );
}
