export interface OrbPreview {
  kind: "orb";
  place: string;
  country: string | null;
  claimCount: number;
}

export interface ClusterPreview {
  kind: "cluster";
  placeCount: number;
  claimCount: number;
}

export type MapPreview = OrbPreview | ClusterPreview;

export interface AnchoredMapPreview {
  preview: MapPreview;
  x: number;
  y: number;
  dataKey: object | null;
}

export type MapPreviewAction =
  | {
      type: "hover";
      properties: Record<string, unknown> | null | undefined;
      point: { x: number; y: number };
      dataKey: object | null;
    }
  | { type: "clear"; reason: "leave" | "move" };

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function readMapPreview(
  properties: Record<string, unknown> | null | undefined,
): MapPreview | null {
  if (!properties) return null;

  if (properties.cluster === true) {
    if (!isPositiveInteger(properties.point_count)) return null;
    if (!isPositiveInteger(properties.claimCount)) return null;
    return {
      kind: "cluster",
      placeCount: properties.point_count,
      claimCount: properties.claimCount,
    };
  }

  if ("point_count" in properties || "cluster_id" in properties) return null;
  if (typeof properties.place !== "string" || !properties.place.trim()) return null;
  if (!isPositiveInteger(properties.claimCount)) return null;
  const country =
    typeof properties.country === "string" && properties.country.trim() ? properties.country : null;
  return {
    kind: "orb",
    place: properties.place,
    country,
    claimCount: properties.claimCount,
  };
}

export function mapPreviewReducer(
  _current: AnchoredMapPreview | null,
  action: MapPreviewAction,
): AnchoredMapPreview | null {
  if (action.type === "clear") return null;
  const preview = readMapPreview(action.properties);
  return preview
    ? { preview, x: action.point.x, y: action.point.y, dataKey: action.dataKey }
    : null;
}

export function visibleMapPreview(
  current: AnchoredMapPreview | null,
  dataKey: object | null,
): AnchoredMapPreview | null {
  return current?.dataKey === dataKey ? current : null;
}
