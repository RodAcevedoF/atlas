import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";

export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
export const INITIAL_VIEW_STATE = { longitude: 10, latitude: 25, zoom: 1.3 };
export const RESET_CAMERA = {
  center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude] as [number, number],
  zoom: INITIAL_VIEW_STATE.zoom,
};

export const AWARENESS_SOURCE = "awareness-distribution";
export const AWARENESS_GLOW_LAYER = "awareness-glow";
export const AWARENESS_ORB_LAYER = "awareness-orbs";
export const AWARENESS_CLUSTER_LAYER = "awareness-clusters";
export const AWARENESS_CLUSTER_COUNT_LAYER = "awareness-cluster-counts";
export const AWARENESS_SELECTION_LAYER = "awareness-selection";
export const AWARENESS_LABEL_LAYER = "awareness-labels";

export const CLUSTER_RADIUS = 12;
export const CLUSTER_MAX_ZOOM = 7;
const IS_CLUSTER = ["has", "point_count"];
export const CLUSTER_FILTER = IS_CLUSTER as unknown as FilterSpecification;
export const PLACE_FILTER = ["!", IS_CLUSTER] as unknown as FilterSpecification;

const LABEL_INTENSITY_FLOOR = 0.45;

function intensityOf(peak: number): ExpressionSpecification {
  return ["sqrt", ["/", ["get", "claimCount"], Math.max(peak, 1)]] as ExpressionSpecification;
}

const ZOOM_SCALE: Array<[number, number]> = [
  [0, 1.6],
  [2, 1.35],
  [4, 1.14],
  [7, 1],
];

function radiusRamp(
  peak: number,
  quietest: number,
  loudest: number,
  offset = 0,
): ExpressionSpecification {
  const stops = ZOOM_SCALE.flatMap(([zoom, scale]) => [
    zoom,
    [
      "interpolate",
      ["linear"],
      intensityOf(peak),
      0,
      quietest * scale + offset,
      1,
      loudest * scale + offset,
    ],
  ]);
  return ["interpolate", ["linear"], ["zoom"], ...stops] as unknown as ExpressionSpecification;
}

export function orbRadius(peak: number): ExpressionSpecification {
  return radiusRamp(peak, 6, 32);
}

const CLUSTER_PLACES_FOR_FULL_SIZE = 25;

function clusterWeight(): ExpressionSpecification {
  return ["/", ["get", "point_count"], CLUSTER_PLACES_FOR_FULL_SIZE] as ExpressionSpecification;
}

export function clusterRadius(): ExpressionSpecification {
  const stops = ZOOM_SCALE.flatMap(([zoom, scale]) => [
    zoom,
    ["interpolate", ["linear"], clusterWeight(), 0, 15 * scale, 1, 41 * scale],
  ]);
  return ["interpolate", ["linear"], ["zoom"], ...stops] as unknown as ExpressionSpecification;
}

export function clusterColor(ramp: string[]): ExpressionSpecification {
  const stops = ramp.flatMap((hex, index) => [index / (ramp.length - 1), hex]);
  return ["interpolate", ["linear"], clusterWeight(), ...stops] as ExpressionSpecification;
}

export function glowRadius(peak: number): ExpressionSpecification {
  return radiusRamp(peak, 6, 32, 14);
}

export function selectionRadius(peak: number): ExpressionSpecification {
  return radiusRamp(peak, 6, 32, 5);
}

export function orbColor(peak: number, ramp: string[]): ExpressionSpecification {
  const stops = ramp.flatMap((hex, index) => [index / (ramp.length - 1), hex]);
  return ["interpolate", ["linear"], intensityOf(peak), ...stops] as ExpressionSpecification;
}

const COUNTRY_LEVEL = ["boolean", ["get", "isCountryLevel"], false];

function byGranularity(countryLevel: number, specific: number): ExpressionSpecification {
  return ["case", COUNTRY_LEVEL, countryLevel, specific] as unknown as ExpressionSpecification;
}

export const AWARENESS_ORB_OPACITY = byGranularity(0.14, 0.9);
export const AWARENESS_ORB_STROKE_OPACITY = byGranularity(0.8, 0.3);
export const AWARENESS_GLOW_OPACITY = byGranularity(0.04, 0.12);

export const AWARENESS_CLUSTER_OPACITY = 0.72;
export const AWARENESS_CLUSTER_COUNT_SIZE = [
  "interpolate",
  ["linear"],
  ["zoom"],
  0,
  17,
  4,
  14,
  7,
  13,
] as unknown as ExpressionSpecification;
export const AWARENESS_CLUSTER_COUNT_TEXT = [
  "get",
  "point_count_abbreviated",
] as unknown as ExpressionSpecification;

export const AWARENESS_CLUSTER_PROPERTIES = {
  claimCount: ["+", ["get", "claimCount"]],
};

export const AWARENESS_LABEL_TEXT = ["get", "place"] as unknown as ExpressionSpecification;

export function placeLabelFilter(peak: number): FilterSpecification {
  return [
    "all",
    PLACE_FILTER,
    [">", intensityOf(peak), LABEL_INTENSITY_FLOOR],
  ] as unknown as FilterSpecification;
}

export const INTERACTIVE_LAYERS = [AWARENESS_ORB_LAYER, AWARENESS_CLUSTER_LAYER];

export const BASEMAP_LAND_LAYERS = [
  "background",
  "landcover_ice_shelf",
  "landcover_glacier",
  "landuse_residential",
  "landcover_wood",
  "landuse_park",
];
export const BASEMAP_WATER_LAYERS = ["water", "waterway"];
