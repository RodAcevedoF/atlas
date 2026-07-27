import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
  Topic,
} from "../../../repositories/market-repository.ts";
import { TOPIC_LABELS } from "../../../utils/index.ts";
import type { BreakdownIndex, MapFillMode } from "../types.ts";
import { FILL_REGIONS, REGION_SUBREGIONS } from "./region-for-country.ts";
import { emptyFillHex, sentimentHex, topicHex } from "./theme-colors.ts";

function dominantTopic(record: RegionTopicBreakdownRecord | undefined): Topic | null {
  if (!record || record.topics.length === 0) return null;
  return record.topics.reduce((top, candidate) =>
    candidate.signalCount > top.signalCount ? candidate : top,
  ).topic;
}

function regionFillHex(
  record: RegionTopicBreakdownRecord | undefined,
  mode: MapFillMode,
  emptyFill: string,
): string {
  if (mode === "tendency") return sentimentHex(record?.sentiment ?? 0);
  const topic = dominantTopic(record);
  return topic ? topicHex(topic) : emptyFill;
}

export function buildFillColor(
  byRegion: BreakdownIndex,
  mode: MapFillMode,
): ExpressionSpecification {
  const emptyFill = emptyFillHex();
  const branches: Array<string | string[]> = [];
  for (const region of FILL_REGIONS) {
    branches.push(REGION_SUBREGIONS[region], regionFillHex(byRegion.get(region), mode, emptyFill));
  }
  return [
    "match",
    ["get", "subregion"],
    ...branches,
    emptyFill,
  ] as unknown as ExpressionSpecification;
}

export function buildFillOpacity(byRegion: BreakdownIndex, peak: number): ExpressionSpecification {
  const branches: Array<string | string[] | number> = [];
  for (const region of FILL_REGIONS) {
    const signalCount = byRegion.get(region)?.signalCount ?? 0;
    const ratio = peak > 0 ? signalCount / peak : 0;
    branches.push(REGION_SUBREGIONS[region], Number((0.16 + 0.68 * ratio).toFixed(3)));
  }
  return ["match", ["get", "subregion"], ...branches, 0.05] as unknown as ExpressionSpecification;
}

export function topicsPresent(byRegion: BreakdownIndex): Topic[] {
  const seen: Topic[] = [];
  for (const region of FILL_REGIONS) {
    const topic = dominantTopic(byRegion.get(region));
    if (topic && !seen.includes(topic)) seen.push(topic);
  }
  return seen;
}

export function selectedFilter(region: GeoRegion | null): FilterSpecification {
  const subregions = region && region !== "global" ? REGION_SUBREGIONS[region] : [];
  return ["in", ["get", "subregion"], ["literal", subregions]] as unknown as FilterSpecification;
}

export function hoverDetail(
  record: RegionTopicBreakdownRecord | undefined,
  mode: MapFillMode,
): string | null {
  if (mode === "topic") {
    const topic = dominantTopic(record);
    return topic ? TOPIC_LABELS[topic] : null;
  }
  const sentiment = record?.sentiment ?? 0;
  if (sentiment > 0.15) return "Positive tendency";
  if (sentiment < -0.15) return "Negative tendency";
  return "Neutral tendency";
}
