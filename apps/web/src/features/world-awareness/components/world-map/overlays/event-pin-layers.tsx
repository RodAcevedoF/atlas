import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  CLUSTER_COUNT_TEXT,
  CLUSTER_FILTER,
  CLUSTER_GLOW_RADIUS,
  CLUSTER_HALO_RADIUS,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_RADIUS_PX,
  PIN_CLUSTER_COUNT_LAYER,
  PIN_CLUSTER_GLOW_LAYER,
  PIN_CLUSTER_HALO_LAYER,
  PIN_CLUSTER_LAYER,
  PIN_POINT_GLOW_LAYER,
  PIN_POINT_LAYER,
  PIN_SOURCE,
  POINT_COLOR,
  POINT_FILTER,
  POINT_GLOW_RADIUS,
  POINT_RADIUS,
} from "../constants.ts";
import { CLUSTER_TOPIC_COUNTS, dominantTopicColor } from "../utils/cluster-topic.ts";
import type { PinFeatureCollection } from "../utils/pins.ts";
import { orbRimHex, orbShadowHex } from "../utils/theme-colors.ts";

interface EventPinLayersProps {
  data: PinFeatureCollection;
}

export function EventPinLayers({ data }: EventPinLayersProps) {
  const clusterColor = useMemo(() => dominantTopicColor(), []);
  const rimColor = useMemo(() => orbRimHex(), []);
  const shadowColor = useMemo(() => orbShadowHex(), []);

  return (
    <Source
      id={PIN_SOURCE}
      type="geojson"
      data={data}
      cluster
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
      clusterRadius={CLUSTER_RADIUS_PX}
      clusterProperties={CLUSTER_TOPIC_COUNTS}
    >
      <Layer
        id={PIN_CLUSTER_GLOW_LAYER}
        type="circle"
        filter={CLUSTER_FILTER}
        paint={{
          "circle-color": clusterColor,
          "circle-opacity": 0.08,
          "circle-radius": CLUSTER_GLOW_RADIUS,
        }}
      />
      <Layer
        id={PIN_CLUSTER_HALO_LAYER}
        type="circle"
        filter={CLUSTER_FILTER}
        paint={{
          "circle-color": clusterColor,
          "circle-opacity": 0.2,
          "circle-radius": CLUSTER_HALO_RADIUS,
        }}
      />
      <Layer
        id={PIN_CLUSTER_LAYER}
        type="circle"
        filter={CLUSTER_FILTER}
        paint={{
          "circle-color": clusterColor,
          "circle-opacity": 0.95,
          "circle-radius": CLUSTER_RADIUS,
          "circle-stroke-width": 1.25,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.3,
        }}
      />
      <Layer
        id={PIN_CLUSTER_COUNT_LAYER}
        type="symbol"
        filter={CLUSTER_FILTER}
        layout={{
          "text-field": CLUSTER_COUNT_TEXT,
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-allow-overlap": true,
        }}
        paint={{
          "text-color": rimColor,
          "text-halo-color": shadowColor,
          "text-halo-width": 1,
        }}
      />
      <Layer
        id={PIN_POINT_GLOW_LAYER}
        type="circle"
        filter={POINT_FILTER}
        paint={{
          "circle-color": POINT_COLOR,
          "circle-opacity": 0.14,
          "circle-radius": POINT_GLOW_RADIUS,
        }}
      />
      <Layer
        id={PIN_POINT_LAYER}
        type="circle"
        filter={POINT_FILTER}
        paint={{
          "circle-color": POINT_COLOR,
          "circle-radius": POINT_RADIUS,
          "circle-opacity": 0.95,
          "circle-stroke-width": 1.25,
          "circle-stroke-color": rimColor,
          "circle-stroke-opacity": 0.3,
        }}
      />
    </Source>
  );
}
