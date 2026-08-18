import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { GeoRegion } from "../../../repositories/market-repository.ts";
import {
  COUNTRIES_SOURCE,
  COUNTRIES_URL,
  COUNTRY_FILL_LAYER,
  COUNTRY_SELECTED_LAYER,
  MUTED_FILL_OPACITY,
} from "../constants.ts";
import type { BreakdownIndex, MapFillMode } from "../types.ts";
import { buildFillColor, buildFillOpacity, selectedFilter } from "../utils/fill-expressions.ts";
import { emptyFillHex, primaryHex, regionOutlineColor } from "../utils/theme-colors.ts";

interface CountryFillLayersProps {
  byRegion: BreakdownIndex;
  peak: number;
  mode: MapFillMode;
  selected: GeoRegion | null;
  muted: boolean;
}

export function CountryFillLayers({
  byRegion,
  peak,
  mode,
  selected,
  muted,
}: CountryFillLayersProps) {
  const fillColor = useMemo(() => buildFillColor(byRegion, mode), [byRegion, mode]);
  const fillOpacity = useMemo(() => buildFillOpacity(byRegion, peak), [byRegion, peak]);
  const emptyFill = useMemo(() => emptyFillHex(), []);
  const selectedColor = useMemo(() => primaryHex(), []);
  const outlineColor = useMemo(() => regionOutlineColor(), []);

  return (
    <Source id={COUNTRIES_SOURCE} type="geojson" data={COUNTRIES_URL}>
      <Layer
        id={COUNTRY_FILL_LAYER}
        type="fill"
        paint={{
          "fill-color": muted ? emptyFill : fillColor,
          "fill-opacity": muted ? MUTED_FILL_OPACITY : fillOpacity,
          "fill-outline-color": outlineColor,
        }}
      />
      <Layer
        id={COUNTRY_SELECTED_LAYER}
        type="line"
        filter={selectedFilter(muted ? null : selected)}
        paint={{ "line-color": selectedColor, "line-width": 2 }}
      />
    </Source>
  );
}
