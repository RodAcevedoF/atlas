import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";

export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
export const INITIAL_VIEW_STATE = { longitude: 10, latitude: 25, zoom: 1.3 };
// Same home view in the shape maplibre's camera methods take (easeTo/flyTo).
export const RESET_CAMERA = {
  center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude] as [number, number],
  zoom: INITIAL_VIEW_STATE.zoom,
};

export const AWARENESS_SOURCE = "awareness-distribution";
export const AWARENESS_GLOW_LAYER = "awareness-glow";
export const AWARENESS_ORB_LAYER = "awareness-orbs";
export const AWARENESS_SELECTION_LAYER = "awareness-selection";
export const AWARENESS_LABEL_LAYER = "awareness-labels";
const AWARENESS_CORE_RADIUS = ["interpolate", ["linear"], ["get", "intensity"], 0, 4, 1, 22];
export const AWARENESS_ORB_RADIUS = AWARENESS_CORE_RADIUS as unknown as ExpressionSpecification;
export const AWARENESS_GLOW_RADIUS = [
  "+",
  AWARENESS_CORE_RADIUS,
  14,
] as unknown as ExpressionSpecification;
export const AWARENESS_SELECTION_RADIUS = [
  "+",
  AWARENESS_CORE_RADIUS,
  5,
] as unknown as ExpressionSpecification;

export const AWARENESS_ORB_OPACITY = 0.9;
export const AWARENESS_LABEL_TEXT = ["get", "place"] as unknown as ExpressionSpecification;

export const AWARENESS_LABEL_FILTER = [
  ">",
  ["get", "intensity"],
  0.45,
] as unknown as FilterSpecification;

export const INTERACTIVE_LAYERS = [AWARENESS_ORB_LAYER];

export const BASEMAP_LAND_LAYERS = [
  "background",
  "landcover_ice_shelf",
  "landcover_glacier",
  "landuse_residential",
  "landcover_wood",
  "landuse_park",
];
export const BASEMAP_WATER_LAYERS = ["water", "waterway"];
