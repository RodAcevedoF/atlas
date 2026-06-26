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
import { REGION_LABELS } from "../../common/utils/index.ts";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../repositories/market-repository.ts";
import { FILL_REGIONS, REGION_SUBREGIONS, regionForSubregion } from "./region-for-country.ts";

const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const COUNTRIES_URL = "/world-countries.geojson";
const PRIMARY_RGB = "255, 171, 88"; // theme --primary (#ffab58); MapLibre paint can't read CSS vars
const COUNTRY_FILL_LAYER = "country-fills";

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

export function WorldMap({ byRegion, peak, selected, onSelect }: WorldMapProps) {
  const mapRef = useRef<MapRef>(null);
  const fillColor = useMemo(() => buildFillColor(byRegion, peak), [byRegion, peak]);
  const [hover, setHover] = useState<HoverState | null>(null);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const subregion = event.features?.[0]?.properties?.subregion as string | undefined;
      const region = regionForSubregion(subregion);
      if (region) onSelect(region);
    },
    [onSelect],
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

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[4] flex items-center justify-between bg-gradient-to-b from-card/85 to-transparent px-4 py-3.5">
        <div className="flex flex-col gap-px">
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            World Attention Map
          </span>
          <span className="text-sm font-semibold tracking-[-0.01em]">
            Per-region attention intensity
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Markets + news signals · click a region
        </span>
      </div>

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
                "fill-outline-color": "rgba(255, 171, 88, 0.25)",
              }}
            />
            <Layer
              id="country-selected"
              type="line"
              filter={selectedFilter(selected)}
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
              <div className="text-[11.5px] font-medium">
                {REGION_LABELS[hover.region]} — {byRegion.get(hover.region)?.signalCount ?? 0}{" "}
                signals
              </div>
            </Popup>
          ) : null}
        </MapGL>
      </div>

      <div className="absolute bottom-4 left-4 z-[5] flex flex-col gap-[7px] rounded-xl border border-border bg-card/60 px-3 py-2.5 backdrop-blur-md">
        <span className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
          Attention intensity
        </span>
        <div
          className="h-2 w-[178px] rounded-[5px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,171,88,.1), rgba(255,171,88,.45), var(--primary))",
          }}
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-[5] flex flex-col overflow-hidden rounded-[11px] border border-border bg-card/60 backdrop-blur-md">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-[33px] w-[34px] items-center justify-center border-b border-border text-[17px] text-foreground hover:bg-white/[0.06]"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-[33px] w-[34px] items-center justify-center text-[19px] text-foreground hover:bg-white/[0.06]"
        >
          −
        </button>
      </div>
    </div>
  );
}
