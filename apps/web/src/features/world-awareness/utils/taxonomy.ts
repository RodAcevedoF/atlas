import type { GeoRegion, Topic } from "../repositories/world-repository.ts";

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

export const CURATED_TOPICS: Topic[] = [
  "politics",
  "conflict",
  "economy",
  "business-finance",
  "technology",
  "science-health",
  "climate-environment",
  "society-culture",
  "sports",
];

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

export const CURATED_TOPIC_LABELS: string[] = CURATED_TOPICS.map((topic) => TOPIC_LABELS[topic]);

export const TOPIC_COLOR_VAR: Record<Topic, string> = {
  politics: "var(--topic-politics)",
  conflict: "var(--topic-conflict)",
  economy: "var(--topic-economy)",
  "business-finance": "var(--topic-business-finance)",
  technology: "var(--topic-technology)",
  "science-health": "var(--topic-science-health)",
  "climate-environment": "var(--topic-climate-environment)",
  "society-culture": "var(--topic-society-culture)",
  sports: "var(--topic-sports)",
  other: "var(--topic-other)",
};
