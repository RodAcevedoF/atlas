import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import {
  CLUSTER_COUNT_TEXT,
  CLUSTER_FILTER,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  CLUSTER_RADIUS_PX,
  PIN_CLUSTER_COUNT_LAYER,
  PIN_CLUSTER_LAYER,
  PIN_POINT_LAYER,
  PIN_SOURCE,
  POINT_COLOR,
  POINT_FILTER,
} from "../constants.ts";
import type { PinFeatureCollection } from "../utils/pins.ts";
import { pinStrokeHex, primaryForegroundHex, primaryHex } from "../utils/theme-colors.ts";

interface EventPinLayersProps {
  data: PinFeatureCollection;
}

export function EventPinLayers({ data }: EventPinLayersProps) {
  const clusterColor = useMemo(() => primaryHex(), []);
  const clusterTextColor = useMemo(() => primaryForegroundHex(), []);
  const pinStroke = useMemo(() => pinStrokeHex(), []);

  return (
    <Source
      id={PIN_SOURCE}
      type="geojson"
      data={data}
      cluster
      clusterMaxZoom={CLUSTER_MAX_ZOOM}
      clusterRadius={CLUSTER_RADIUS_PX}
    >
      <Layer
        id={PIN_CLUSTER_LAYER}
        type="circle"
        filter={CLUSTER_FILTER}
        paint={{
          "circle-color": clusterColor,
          "circle-opacity": 0.9,
          "circle-radius": CLUSTER_RADIUS,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": clusterColor,
          "circle-stroke-opacity": 0.35,
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
        paint={{ "text-color": clusterTextColor }}
      />
      <Layer
        id={PIN_POINT_LAYER}
        type="circle"
        filter={POINT_FILTER}
        paint={{
          "circle-color": POINT_COLOR,
          "circle-radius": 6,
          "circle-opacity": 0.95,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": pinStroke,
        }}
      />
    </Source>
  );
}
