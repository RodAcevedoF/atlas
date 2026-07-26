import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useCallback, useMemo, useRef, useState } from "react";
import MapGL, {
  type MapLayerMouseEvent,
  type MapRef,
  Layer,
  Popup,
  Source,
} from "react-map-gl/maplibre";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
  Topic,
} from "../../repositories/market-repository.ts";
import { REGION_LABELS, TOPIC_LABELS } from "../../utils/index.ts";
import { FILL_REGIONS, REGION_SUBREGIONS, regionForSubregion } from "./region-for-country.ts";
import {
  emptyFillHex,
  primaryHex,
  regionOutlineColor,
  sentimentHex,
  topicHex,
} from "./theme-colors.ts";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const COUNTRIES_URL = "/world-countries.geojson";
const COUNTRY_FILL_LAYER = "country-fills";

type MapFillMode = "topic" | "tendency";
type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

interface HoverState {
  longitude: number;
  latitude: number;
  region: GeoRegion;
}

interface WorldMapProps {
  byRegion: BreakdownIndex;
  peak: number;
  selected: GeoRegion | null;
  onSelect: (region: GeoRegion) => void;
  onClearSelection: () => void;
}

function dominantTopic(record: RegionTopicBreakdownRecord | undefined): Topic | null {
  if (!record || record.topics.length === 0) return null;
  return record.topics.reduce((top, candidate) =>
    candidate.signalCount > top.signalCount ? candidate : top,
  ).topic;
}

function regionFillHex(
  record: RegionTopicBreakdownRecord | undefined,
  mode: MapFillMode,
  emptyFill: string,
): string {
  if (mode === "tendency") return sentimentHex(record?.sentiment ?? 0);
  const topic = dominantTopic(record);
  return topic ? topicHex(topic) : emptyFill;
}

function buildFillColor(byRegion: BreakdownIndex, mode: MapFillMode): ExpressionSpecification {
  const emptyFill = emptyFillHex();
  const branches: Array<string | string[]> = [];
  for (const region of FILL_REGIONS) {
    branches.push(REGION_SUBREGIONS[region], regionFillHex(byRegion.get(region), mode, emptyFill));
  }
  return [
    "match",
    ["get", "subregion"],
    ...branches,
    emptyFill,
  ] as unknown as ExpressionSpecification;
}

function buildFillOpacity(byRegion: BreakdownIndex, peak: number): ExpressionSpecification {
  const branches: Array<string | string[] | number> = [];
  for (const region of FILL_REGIONS) {
    const signalCount = byRegion.get(region)?.signalCount ?? 0;
    const ratio = peak > 0 ? signalCount / peak : 0;
    branches.push(REGION_SUBREGIONS[region], Number((0.16 + 0.68 * ratio).toFixed(3)));
  }
  return ["match", ["get", "subregion"], ...branches, 0.05] as unknown as ExpressionSpecification;
}

function topicsPresent(byRegion: BreakdownIndex): Topic[] {
  const seen: Topic[] = [];
  for (const region of FILL_REGIONS) {
    const topic = dominantTopic(byRegion.get(region));
    if (topic && !seen.includes(topic)) seen.push(topic);
  }
  return seen;
}

function selectedFilter(region: GeoRegion | null): FilterSpecification {
  const subregions = region && region !== "global" ? REGION_SUBREGIONS[region] : [];
  return ["in", ["get", "subregion"], ["literal", subregions]] as unknown as FilterSpecification;
}

function hoverDetail(
  record: RegionTopicBreakdownRecord | undefined,
  mode: MapFillMode,
): string | null {
  if (mode === "topic") {
    const topic = dominantTopic(record);
    return topic ? TOPIC_LABELS[topic] : null;
  }
  const sentiment = record?.sentiment ?? 0;
  if (sentiment > 0.15) return "Positive tendency";
  if (sentiment < -0.15) return "Negative tendency";
  return "Neutral tendency";
}

function ModeToggle({
  mode,
  onChange,
}: { mode: MapFillMode; onChange: (mode: MapFillMode) => void }) {
  const modes: Array<{ id: MapFillMode; label: string }> = [
    { id: "topic", label: "Topic" },
    { id: "tendency", label: "Tendency" },
  ];
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.75">
      {modes.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={mode === id}
          className={`rounded-md py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            mode === id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TendencyLegend() {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        Neg
      </span>
      <div
        className="h-1.5 flex-1 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, var(--sentiment-negative), var(--sentiment-neutral), var(--sentiment-positive))",
        }}
      />
      <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        Pos
      </span>
    </div>
  );
}

function TopicLegend({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return <span className="text-[10px] text-muted-foreground">No topic activity</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {topics.map((topic) => (
        <span key={topic} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: `var(--topic-${topic})` }}
          />
          <span className="truncate text-[10px] text-muted-foreground">{TOPIC_LABELS[topic]}</span>
        </span>
      ))}
    </div>
  );
}

export function WorldMap({ byRegion, peak, selected, onSelect, onClearSelection }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<MapFillMode>("tendency");
  const [hover, setHover] = useState<HoverState | null>(null);

  const fillColor = useMemo(() => buildFillColor(byRegion, mode), [byRegion, mode]);
  const fillOpacity = useMemo(() => buildFillOpacity(byRegion, peak), [byRegion, peak]);
  const legendTopics = useMemo(() => topicsPresent(byRegion), [byRegion]);
  const selectedColor = useMemo(() => primaryHex(), []);
  const outlineColor = useMemo(() => regionOutlineColor(), []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const subregion = event.features?.[0]?.properties?.subregion as string | undefined;
      const region = regionForSubregion(subregion);
      if (region) {
        onSelect(region);
        return;
      }
      onClearSelection();
    },
    [onSelect, onClearSelection],
  );

  const handleHover = useCallback((event: MapLayerMouseEvent) => {
    const subregion = event.features?.[0]?.properties?.subregion as string | undefined;
    const region = regionForSubregion(subregion);
    if (!region) {
      setHover(null);
      return;
    }
    setHover({ longitude: event.lngLat.lng, latitude: event.lngLat.lat, region });
  }, []);

  const hoverRecord = hover ? byRegion.get(hover.region) : undefined;
  const hoverDetailText = hover ? hoverDetail(hoverRecord, mode) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <div className="absolute inset-0">
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 10, latitude: 25, zoom: 1.3 }}
          mapStyle={BASEMAP_STYLE}
          interactiveLayerIds={[COUNTRY_FILL_LAYER]}
          cursor={hover ? "pointer" : "grab"}
          onClick={handleClick}
          onMouseMove={handleHover}
          onMouseLeave={() => setHover(null)}
          attributionControl={false}
        >
          <Source id="countries" type="geojson" data={COUNTRIES_URL}>
            <Layer
              id={COUNTRY_FILL_LAYER}
              type="fill"
              paint={{
                "fill-color": fillColor,
                "fill-opacity": fillOpacity,
                "fill-outline-color": outlineColor,
              }}
            />
            <Layer
              id="country-selected"
              type="line"
              filter={selectedFilter(selected)}
              paint={{ "line-color": selectedColor, "line-width": 2 }}
            />
          </Source>
          {hover ? (
            <Popup
              longitude={hover.longitude}
              latitude={hover.latitude}
              closeButton={false}
              closeOnClick={false}
              offset={12}
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[11.5px] font-medium">
                  {REGION_LABELS[hover.region]} — {hoverRecord?.signalCount ?? 0} signals
                </div>
                {hoverDetailText ? (
                  <div className="text-[10px] text-muted-foreground">{hoverDetailText}</div>
                ) : null}
              </div>
            </Popup>
          ) : null}
        </MapGL>
      </div>

      <div className="absolute right-4 top-4 z-5 flex w-46 flex-col gap-2.5 rounded-xl border border-border bg-card/70 p-2.5 backdrop-blur-md">
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="h-px w-full bg-border" />
        {mode === "tendency" ? <TendencyLegend /> : <TopicLegend topics={legendTopics} />}
      </div>

      <div className="absolute bottom-4 left-1/2 z-5 flex -translate-x-1/2 overflow-hidden rounded-[11px] border border-border bg-card/60 backdrop-blur-md">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-8.5 w-9 items-center justify-center border-r border-border text-[19px] text-foreground hover:bg-white/6"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-8.5 w-9 items-center justify-center text-[17px] text-foreground hover:bg-white/6"
        >
          +
        </button>
      </div>
    </div>
  );
}
