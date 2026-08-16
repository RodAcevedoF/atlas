import type { GeoRegion, Signal, SignalSource, Topic } from "@atlas/domain";
import { makeSignalId } from "@atlas/domain";

const HOUR_MS = 3_600_000;

export interface BuildSignalOptions {
  ref: string;
  hoursAgo?: number;
  weight?: number;
  source?: SignalSource;
  topic?: Topic;
  primaryRegion?: GeoRegion;
  regions?: GeoRegion[];
  sourceCountry?: string | null;
  title?: string;
  sentiment?: number;
}

export function buildSignal({
  ref,
  hoursAgo = 0,
  weight = 1,
  source = "news",
  topic = "conflict",
  primaryRegion = "middle-east",
  regions,
  sourceCountry = null,
  title,
  sentiment = -0.4,
}: BuildSignalOptions): Signal {
  const timestamp = new Date(Date.now() - hoursAgo * HOUR_MS);
  return {
    id: makeSignalId(`${source}:${ref}`),
    source,
    topic,
    primaryRegion,
    regions: regions ?? [...new Set<GeoRegion>([primaryRegion, "global"])],
    sourceCountry,
    weight,
    sentiment,
    title: title ?? `Headline ${ref}`,
    ref,
    timestamp,
    createdAt: timestamp,
  };
}
