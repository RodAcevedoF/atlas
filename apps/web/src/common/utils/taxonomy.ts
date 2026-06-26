import type { GeoRegion, Topic } from "../../repositories/market-repository.ts";

export const REGION_LABELS: Record<GeoRegion, string> = {
  "north-america": "North America",
  "latin-america": "Latin America",
  europe: "Europe",
  "middle-east": "Middle East",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
  global: "Global",
};

export const TOPIC_LABELS: Record<Topic, string> = {
  politics: "Politics",
  conflict: "Conflict",
  economy: "Economy",
  "business-finance": "Business & Finance",
  technology: "Technology",
  "science-health": "Science & Health",
  "climate-environment": "Climate & Environment",
  "society-culture": "Society & Culture",
  sports: "Sports",
  other: "Other",
};
