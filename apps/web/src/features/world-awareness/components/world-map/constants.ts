import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";

export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
export const COUNTRIES_URL = "/world-countries.geojson";
export const INITIAL_VIEW_STATE = { longitude: 10, latitude: 25, zoom: 1.3 };

export const COUNTRIES_SOURCE = "countries";
export const COUNTRY_FILL_LAYER = "country-fills";
export const COUNTRY_SELECTED_LAYER = "country-selected";

export const PIN_SOURCE = "event-pins";
export const PIN_CLUSTER_LAYER = "pin-clusters";
export const PIN_CLUSTER_COUNT_LAYER = "pin-cluster-count";
export const PIN_POINT_LAYER = "pin-unclustered";
export const CLUSTER_MAX_ZOOM = 4;
export const CLUSTER_RADIUS_PX = 40;

// Layers the map treats as interactive for click/hover dispatch.
export const INTERACTIVE_LAYERS = [COUNTRY_FILL_LAYER, PIN_CLUSTER_LAYER, PIN_POINT_LAYER];

export const CLUSTER_FILTER = ["has", "point_count"] as FilterSpecification;
export const POINT_FILTER = ["!", ["has", "point_count"]] as FilterSpecification;
export const CLUSTER_RADIUS = [
  "step",
  ["get", "point_count"],
  13,
  10,
  17,
  25,
  22,
] as unknown as ExpressionSpecification;
export const POINT_COLOR = ["get", "color"] as unknown as ExpressionSpecification;
export const CLUSTER_COUNT_TEXT = [
  "get",
  "point_count_abbreviated",
] as unknown as ExpressionSpecification;
