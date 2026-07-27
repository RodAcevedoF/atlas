import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../repositories/market-repository.ts";

export type MapFillMode = "topic" | "tendency";
export type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

export interface HoverState {
  longitude: number;
  latitude: number;
  region: GeoRegion;
}
