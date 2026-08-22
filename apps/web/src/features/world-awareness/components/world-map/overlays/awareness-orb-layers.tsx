import { useMemo } from "react";
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
  AWARENESS_SOURCE,
} from "../constants.ts";
import type { ClaimFeatureCollection } from "../utils/claim-points.ts";
import { buildAwarenessRamp } from "../utils/fill-expressions.ts";
import { orbRimHex, orbShadowHex } from "../utils/theme-colors.ts";

interface AwarenessOrbLayersProps {
  data: ClaimFeatureCollection;
}

export function AwarenessOrbLayers({ data }: AwarenessOrbLayersProps) {
  const rimColor = useMemo(() => orbRimHex(), []);
  const shadowColor = useMemo(() => orbShadowHex(), []);
  const orbColor = useMemo(() => buildAwarenessRamp(), []);

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
