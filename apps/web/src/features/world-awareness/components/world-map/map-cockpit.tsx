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
import { FloatingPanel } from "./panels/floating-panel.tsx";
import { PinDetail } from "./panels/pin-detail.tsx";
import { RegionDetailPanel } from "./panels/region-detail-panel.tsx";
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
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
      <div className="absolute inset-0">
        <WorldMap
          byRegion={byRegion}
          peak={peak}
          selected={selectedRegion}
          events={worldEvents}
          onSelect={selectRegion}
          onSelectEvent={selectEvent}
          onClearSelection={clearSelection}
        />
      </div>

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
