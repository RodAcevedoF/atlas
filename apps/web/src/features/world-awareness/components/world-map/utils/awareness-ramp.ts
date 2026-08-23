import type { ExpressionSpecification } from "maplibre-gl";
import { emptyFillHex, primaryHex } from "./theme-colors.ts";

export function buildAwarenessRamp(): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["get", "intensity"],
    0,
    emptyFillHex(),
    1,
    primaryHex(),
  ] as unknown as ExpressionSpecification;
}
