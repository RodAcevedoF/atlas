import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useCallback, useMemo, useState } from "react";
import MapGL, {
  type MapLayerMouseEvent,
  Layer,
  NavigationControl,
  Popup,
  Source,
} from "react-map-gl/maplibre";
import { REGION_LABELS, TOPIC_LABELS } from "../../common/utils/index.ts";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../repositories/market-repository.ts";
import { FILL_REGIONS, REGION_SUBREGIONS, regionForSubregion } from "./region-for-country.ts";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const COUNTRIES_URL = "/world-countries.geojson";
const PRIMARY_RGB = "255, 171, 88"; // theme --primary (#ffab58); MapLibre paint can't read CSS vars
const COUNTRY_FILL_LAYER = "country-fills";

interface WorldAttentionMapProps {
  breakdowns: RegionTopicBreakdownRecord[];
}

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

interface HoverState {
  longitude: number;
  latitude: number;
  region: GeoRegion;
}

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

function maxSignalCount(breakdowns: RegionTopicBreakdownRecord[]): number {
  return breakdowns.reduce((peak, breakdown) => Math.max(peak, breakdown.signalCount), 0);
}

function defaultRegion(breakdowns: RegionTopicBreakdownRecord[]): GeoRegion | null {
  const leader = [...breakdowns].sort((left, right) => right.signalCount - left.signalCount)[0];
  return leader?.region ?? null;
}

// Data-driven choropleth: opacity scales with each region's share of the peak, keyed on the
// country's UN subregion. Rebuilt whenever the breakdowns change.
function buildFillColor(byRegion: BreakdownIndex, peak: number): ExpressionSpecification {
  const branches: Array<string | string[]> = [];
  for (const region of FILL_REGIONS) {
    const signalCount = byRegion.get(region)?.signalCount ?? 0;
    const ratio = peak > 0 ? signalCount / peak : 0;
    const opacity = (0.08 + 0.8 * ratio).toFixed(3);
    branches.push(REGION_SUBREGIONS[region], `rgba(${PRIMARY_RGB}, ${opacity})`);
  }
  // Cast: a dynamically-built `match` expression can't be expressed as a static tuple type.
  return [
    "match",
    ["get", "subregion"],
    ...branches,
    `rgba(${PRIMARY_RGB}, 0.04)`,
  ] as unknown as ExpressionSpecification;
}

function selectedFilter(region: GeoRegion | null): FilterSpecification {
  const subregions = region && region !== "global" ? REGION_SUBREGIONS[region] : [];
  return ["in", ["get", "subregion"], ["literal", subregions]] as unknown as FilterSpecification;
}

export function WorldAttentionMap({ breakdowns }: WorldAttentionMapProps) {
  const byRegion = useMemo(() => indexByRegion(breakdowns), [breakdowns]);
  const peak = useMemo(() => maxSignalCount(breakdowns), [breakdowns]);
  const fillColor = useMemo(() => buildFillColor(byRegion, peak), [byRegion, peak]);

  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const active = selectedRegion ?? defaultRegion(breakdowns);
  const selected = active ? byRegion.get(active) : undefined;
  const regionOrder: GeoRegion[] = [...FILL_REGIONS, "global"];

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    const subregion = event.features?.[0]?.properties?.subregion as string | undefined;
    const region = regionForSubregion(subregion);
    if (region) setSelectedRegion(region);
  }, []);

  const handleHover = useCallback((event: MapLayerMouseEvent) => {
    const subregion = event.features?.[0]?.properties?.subregion as string | undefined;
    const region = regionForSubregion(subregion);
    if (!region) {
      setHover(null);
      return;
    }
    setHover({ longitude: event.lngLat.lng, latitude: event.lngLat.lat, region });
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
        <div className="h-[460px] w-full">
          <MapGL
            initialViewState={{ longitude: 10, latitude: 25, zoom: 1.3 }}
            mapStyle={BASEMAP_STYLE}
            interactiveLayerIds={[COUNTRY_FILL_LAYER]}
            cursor={hover ? "pointer" : "grab"}
            onClick={handleClick}
            onMouseMove={handleHover}
            onMouseLeave={() => setHover(null)}
            attributionControl={false}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <Source id="countries" type="geojson" data={COUNTRIES_URL}>
              <Layer
                id={COUNTRY_FILL_LAYER}
                type="fill"
                paint={{
                  "fill-color": fillColor,
                  "fill-outline-color": "rgba(255, 171, 88, 0.25)",
                }}
              />
              <Layer
                id="country-selected"
                type="line"
                filter={selectedFilter(active)}
                paint={{ "line-color": `rgb(${PRIMARY_RGB})`, "line-width": 2 }}
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
                <div className="text-xs font-medium">
                  {REGION_LABELS[hover.region]} — {byRegion.get(hover.region)?.signalCount ?? 0}{" "}
                  signals
                </div>
              </Popup>
            ) : null}
          </MapGL>
        </div>

        <div className="flex flex-wrap gap-2 p-3">
          {regionOrder.map((region) => {
            const isSelected = active === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => setSelectedRegion(region)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {REGION_LABELS[region]}
                <span className="text-xs opacity-70">{byRegion.get(region)?.signalCount ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <TopicBreakdownPanel region={active} breakdown={selected} />
    </div>
  );
}

interface TopicBreakdownPanelProps {
  region: GeoRegion | null;
  breakdown: RegionTopicBreakdownRecord | undefined;
}

function TopicBreakdownPanel({ region, breakdown }: TopicBreakdownPanelProps) {
  if (!region) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        No signals yet. Sync markets and news to populate the map.
      </div>
    );
  }

  const topics = breakdown?.topics ?? [];
  const topicPeak = topics.reduce((peak, topic) => Math.max(peak, topic.signalCount), 0);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Topic breakdown</div>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{REGION_LABELS[region]}</h3>
      <div className="text-sm text-muted-foreground">
        {breakdown
          ? `${breakdown.signalCount} signals across sources`
          : "No signals in this region yet"}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {topics.map((topic) => (
          <div key={topic.topic}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{TOPIC_LABELS[topic.topic]}</span>
              <span className="text-muted-foreground">{topic.signalCount}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${topicPeak > 0 ? Math.round((topic.signalCount / topicPeak) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
        {topics.length === 0 ? (
          <div className="text-sm text-muted-foreground">No topic activity recorded here.</div>
        ) : null}
      </div>
    </div>
  );
}
