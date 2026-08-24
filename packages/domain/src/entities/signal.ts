import type { GeoRegion } from "./geography.ts";

export type SignalId = string & { readonly _brand: "SignalId" };

export function makeSignalId(v: string): SignalId {
  return v as SignalId;
}

export const SIGNAL_SOURCES = ["news"] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export const TOPICS = [
  "politics",
  "conflict",
  "economy",
  "business-finance",
  "technology",
  "science-health",
  "climate-environment",
  "society-culture",
  "sports",
  "other",
] as const;
export type Topic = (typeof TOPICS)[number];

export interface Signal {
  id: SignalId;
  source: SignalSource;
  topic: Topic;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  sourceCountry: string | null;
  weight: number;
  sentiment: number;
  title: string;
  ref: string;
  timestamp: Date;
  createdAt: Date;
}
