import type { FilterSpecification } from "maplibre-gl";
import { memo, useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  AWARENESS_CLUSTER_COUNT_LAYER,
  AWARENESS_CLUSTER_COUNT_SIZE,
  AWARENESS_CLUSTER_COUNT_TEXT,
  AWARENESS_CLUSTER_LAYER,
  AWARENESS_CLUSTER_OPACITY,
  AWARENESS_GLOW_LAYER,
  AWARENESS_GLOW_OPACITY,
  AWARENESS_LABEL_LAYER,
  AWARENESS_LABEL_TEXT,
  AWARENESS_ORB_LAYER,
  AWARENESS_ORB_OPACITY,
  AWARENESS_ORB_STROKE_OPACITY,
  AWARENESS_SELECTION_LAYER,
  AWARENESS_SOURCE,
  CLUSTER_FILTER,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  PLACE_FILTER,
  clusterColor,
  clusterRadius,
  glowRadius,
  orbColor,
  orbRadius,
  placeLabelFilter,
  selectionRadius,
} from "../constants.ts";
import { type ClaimFeatureCollection, peakClaimCount } from "../utils/claim-points.ts";
import { orbRampHexes, orbRimHex, orbShadowHex } from "../utils/theme-colors.ts";

interface AwarenessOrbLayersProps {
  data: ClaimFeatureCollection;
  selectedPlace: string | null;
}

function selectionFilter(selectedPlace: string | null): FilterSpecification {
  return [
    "all",
    PLACE_FILTER,
    ["==", ["get", "place"], selectedPlace ?? ""],
  ] as unknown as FilterSpecification;
}

function AwarenessOrbLayersView({ data, selectedPlace }: AwarenessOrbLayersProps) {
  const rimColor = useMemo(() => orbRimHex(), []);
  const shadowColor = useMemo(() => orbShadowHex(), []);
  const peak = useMemo(() => peakClaimCount(data), [data]);
  const color = useMemo(() => orbColor(peak, orbRampHexes()), [peak]);
  const groupColor = useMemo(() => clusterColor(orbRampHexes()), []);
  const selected = useMemo(() => selectionFilter(selectedPlace), [selectedPlace]);
  const labelFilter = useMemo(() => placeLabelFilter(peak), [peak]);

  return (
    <Source
      id={AWARENESS_SOURCE}
      type="geojson"
      data={data}
      cluster
      clusterRadius={CLUSTER_RADIUS}
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
    >
      <Layer
        id={AWARENESS_GLOW_LAYER}
        type="circle"
        filter={PLACE_FILTER}
        paint={{
          "circle-color": color,
          "circle-opacity": AWARENESS_GLOW_OPACITY,
          "circle-radius": glowRadius(peak),
        }}
      />
      <Layer
        id={AWARENESS_CLUSTER_LAYER}
        type="circle"
        filter={CLUSTER_FILTER}
        paint={{
          "circle-color": groupColor,
          "circle-opacity": AWARENESS_CLUSTER_OPACITY,
          "circle-radius": clusterRadius(),
          "circle-stroke-width": 1.25,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.55,
        }}
      />
      <Layer
        id={AWARENESS_ORB_LAYER}
        type="circle"
        filter={PLACE_FILTER}
        paint={{
          "circle-color": color,
          "circle-opacity": AWARENESS_ORB_OPACITY,
          "circle-radius": orbRadius(peak),
          "circle-stroke-width": 1.25,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": AWARENESS_ORB_STROKE_OPACITY,
        }}
      />
      <Layer
        id={AWARENESS_SELECTION_LAYER}
        type="circle"
        filter={selected}
        paint={{
          "circle-opacity": 0,
          "circle-radius": selectionRadius(peak),
          "circle-stroke-width": 1.5,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.85,
        }}
      />
      <Layer
        id={AWARENESS_CLUSTER_COUNT_LAYER}
        type="symbol"
        filter={CLUSTER_FILTER}
        layout={{
          "text-field": AWARENESS_CLUSTER_COUNT_TEXT,
          "text-font": ["Noto Sans Regular"],
          "text-size": AWARENESS_CLUSTER_COUNT_SIZE,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{
          "text-color": rimColor,
          "text-halo-color": shadowColor,
          "text-halo-width": 1,
        }}
      />
      <Layer
        id={AWARENESS_LABEL_LAYER}
        type="symbol"
        filter={labelFilter}
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
