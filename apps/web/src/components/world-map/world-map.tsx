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
const PRIMARY_RGB = "255, 171, 88";
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

      <div className="absolute left-1/2 top-4 z-5 flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2 backdrop-blur-md">
        <span className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
          Attention
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">Low</span>
        <div
          className="h-2 w-35 rounded-[5px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,171,88,.1), rgba(255,171,88,.45), var(--primary))",
          }}
        />
        <span className="font-mono text-[10px] text-muted-foreground">High</span>
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
