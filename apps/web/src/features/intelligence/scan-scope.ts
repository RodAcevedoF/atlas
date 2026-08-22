import type {
  GeoRegion,
  Topic,
  WorldScanInput,
} from "@/features/world-awareness/repositories/market-repository.ts";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";

function toTopic(value: string | null): Topic | undefined {
  return value && (TOPICS as readonly string[]).includes(value) ? (value as Topic) : undefined;
}

function toRegion(value: string | null): GeoRegion | undefined {
  return value && (GEO_REGIONS as readonly string[]).includes(value)
    ? (value as GeoRegion)
    : undefined;
}

export function parseScanScope(params: URLSearchParams): WorldScanInput {
  return { topic: toTopic(params.get("topic")), region: toRegion(params.get("region")) };
}
