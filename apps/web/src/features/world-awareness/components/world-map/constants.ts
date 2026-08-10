import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";

export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
export const COUNTRIES_URL = "/world-countries.geojson";
export const INITIAL_VIEW_STATE = { longitude: 10, latitude: 25, zoom: 1.3 };
// Same home view in the shape maplibre's camera methods take (easeTo/flyTo).
export const RESET_CAMERA = {
  center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude] as [number, number],
  zoom: INITIAL_VIEW_STATE.zoom,
};

export const COUNTRIES_SOURCE = "countries";
export const COUNTRY_FILL_LAYER = "country-fills";
export const COUNTRY_SELECTED_LAYER = "country-selected";

export const PIN_SOURCE = "event-pins";
export const PIN_CLUSTER_GLOW_LAYER = "pin-cluster-glow";
export const PIN_CLUSTER_HALO_LAYER = "pin-cluster-halo";
export const PIN_CLUSTER_LAYER = "pin-clusters";
export const PIN_CLUSTER_COUNT_LAYER = "pin-cluster-count";
export const PIN_POINT_GLOW_LAYER = "pin-point-glow";
export const PIN_POINT_LAYER = "pin-unclustered";
export const CLUSTER_MAX_ZOOM = 4;
export const CLUSTER_RADIUS_PX = 40;
export const INTERACTIVE_LAYERS = [COUNTRY_FILL_LAYER, PIN_CLUSTER_LAYER, PIN_POINT_LAYER];

export const BASEMAP_LAND_LAYERS = [
  "background",
  "landcover_ice_shelf",
  "landcover_glacier",
  "landuse_residential",
  "landcover_wood",
  "landuse_park",
];
export const BASEMAP_WATER_LAYERS = ["water", "waterway"];

export const CLUSTER_FILTER = ["has", "point_count"] as FilterSpecification;
export const POINT_FILTER = ["!", ["has", "point_count"]] as FilterSpecification;
const CLUSTER_CORE_RADIUS = [
  "interpolate",
  ["linear"],
  ["sqrt", ["get", "point_count"]],
  1,
  11,
  10,
  26,
];
export const CLUSTER_RADIUS = CLUSTER_CORE_RADIUS as unknown as ExpressionSpecification;
export const CLUSTER_HALO_RADIUS = [
  "+",
  CLUSTER_CORE_RADIUS,
  6,
] as unknown as ExpressionSpecification;
export const CLUSTER_GLOW_RADIUS = [
  "+",
  CLUSTER_CORE_RADIUS,
  16,
] as unknown as ExpressionSpecification;
export const POINT_RADIUS = 6;
export const POINT_GLOW_RADIUS = 15;
export const POINT_COLOR = ["get", "color"] as unknown as ExpressionSpecification;
export const CLUSTER_COUNT_TEXT = [
  "get",
  "point_count_abbreviated",
] as unknown as ExpressionSpecification;
