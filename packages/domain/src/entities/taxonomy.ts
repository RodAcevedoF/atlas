export const GEO_REGIONS = [
  "north-america",
  "latin-america",
  "europe",
  "middle-east",
  "africa",
  "asia",
  "oceania",
  "global",
] as const;
export type GeoRegion = (typeof GEO_REGIONS)[number];

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
