import type { FilterSpecification } from "maplibre-gl";
import { memo, useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  AWARENESS_GLOW_LAYER,
  AWARENESS_GLOW_RADIUS,
  AWARENESS_LABEL_FILTER,
  AWARENESS_LABEL_LAYER,
  AWARENESS_LABEL_TEXT,
  AWARENESS_ORB_LAYER,
  AWARENESS_ORB_OPACITY,
  AWARENESS_ORB_RADIUS,
  AWARENESS_SELECTION_LAYER,
  AWARENESS_SELECTION_RADIUS,
  AWARENESS_SOURCE,
} from "../constants.ts";
import { buildAwarenessRamp } from "../utils/awareness-ramp.ts";
import type { ClaimFeatureCollection } from "../utils/claim-points.ts";
import { orbRimHex, orbShadowHex } from "../utils/theme-colors.ts";

interface AwarenessOrbLayersProps {
  data: ClaimFeatureCollection;
  selectedPlace: string | null;
}

function selectionFilter(selectedPlace: string | null): FilterSpecification {
  return ["==", ["get", "place"], selectedPlace ?? ""] as unknown as FilterSpecification;
}

function AwarenessOrbLayersView({ data, selectedPlace }: AwarenessOrbLayersProps) {
  const rimColor = useMemo(() => orbRimHex(), []);
  const shadowColor = useMemo(() => orbShadowHex(), []);
  const orbColor = useMemo(() => buildAwarenessRamp(), []);
  const selected = useMemo(() => selectionFilter(selectedPlace), [selectedPlace]);

  return (
    <Source id={AWARENESS_SOURCE} type="geojson" data={data}>
      <Layer
        id={AWARENESS_GLOW_LAYER}
        type="circle"
        paint={{
          "circle-color": orbColor,
          "circle-opacity": 0.12,
          "circle-radius": AWARENESS_GLOW_RADIUS,
        }}
      />
      <Layer
        id={AWARENESS_ORB_LAYER}
        type="circle"
        paint={{
          "circle-color": orbColor,
          "circle-opacity": AWARENESS_ORB_OPACITY,
          "circle-radius": AWARENESS_ORB_RADIUS,
          "circle-stroke-width": 1.25,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.3,
        }}
      />
      <Layer
        id={AWARENESS_SELECTION_LAYER}
        type="circle"
        filter={selected}
        paint={{
          "circle-opacity": 0,
          "circle-radius": AWARENESS_SELECTION_RADIUS,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.85,
        }}
      />
      <Layer
        id={AWARENESS_LABEL_LAYER}
        type="symbol"
        filter={AWARENESS_LABEL_FILTER}
        layout={{
          "text-field": AWARENESS_LABEL_TEXT,
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, 1.9],
          "text-anchor": "top",
        }}
        paint={{
          "text-color": rimColor,
          "text-halo-color": shadowColor,
          "text-halo-width": 1,
        }}
      />
    </Source>
  );
}

export const AwarenessOrbLayers = memo(AwarenessOrbLayersView);
