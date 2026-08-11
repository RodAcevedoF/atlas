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
}

export function buildSignal({
  ref,
  hoursAgo = 0,
  weight = 1,
  source = "news",
  topic = "conflict",
  primaryRegion = "middle-east",
}: BuildSignalOptions): Signal {
  const timestamp = new Date(Date.now() - hoursAgo * HOUR_MS);
  return {
    id: makeSignalId(`${source}:${ref}`),
    source,
    topic,
    primaryRegion,
    regions: [...new Set<GeoRegion>([primaryRegion, "global"])],
    weight,
    sentiment: -0.4,
    title: `Headline ${ref}`,
    ref,
    timestamp,
    createdAt: timestamp,
  };
}
