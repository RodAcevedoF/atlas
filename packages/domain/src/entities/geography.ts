import type { GeoRegion } from "./market.ts";
import type { Topic } from "./signal.ts";

const DEFAULT_REGION: GeoRegion = "global";

const REGION_KEYWORDS: Array<{
  region: GeoRegion;
  keywords: readonly string[];
}> = [
  {
    region: "north-america",
    keywords: [
      "united states",
      "usa",
      "us election",
      "america",
      "canada",
      "mexico",
      "trump",
      "biden",
      "california",
    ],
  },
  {
    region: "latin-america",
    keywords: ["brazil", "argentina", "milei", "colombia", "chile", "peru", "latin america"],
  },
  {
    region: "europe",
    keywords: [
      "europe",
      "european union",
      "uk",
      "united kingdom",
      "france",
      "germany",
      "italy",
      "spain",
      "ukraine",
    ],
  },
  {
    region: "middle-east",
    keywords: ["israel", "iran", "gaz", "gaza", "saudi", "qatar", "uae", "lebanon", "syria"],
  },
  {
    region: "africa",
    keywords: ["africa", "nigeria", "egypt", "south africa", "ethiopia", "kenya"],
  },
  {
    region: "asia",
    keywords: [
      "china",
      "japan",
      "india",
      "taiwan",
      "korea",
      "asia",
      "beijing",
      "hong kong",
      "singapore",
    ],
  },
  {
    region: "oceania",
    keywords: ["australia", "new zealand", "oceania"],
  },
];

const TOPIC_KEYWORDS: Array<{
  topic: Topic;
  keywords: readonly string[];
}> = [
  {
    topic: "conflict",
    keywords: [
      "war",
      "conflict",
      "attack",
      "military",
      "missile",
      "strike",
      "troops",
      "ceasefire",
      "invasion",
      "airstrike",
    ],
  },
  {
    topic: "politics",
    keywords: [
      "election",
      "president",
      "parliament",
      "minister",
      "vote",
      "campaign",
      "senate",
      "government",
      "policy",
      "diplomacy",
      "sanction",
    ],
  },
  {
    topic: "economy",
    keywords: [
      "inflation",
      "gdp",
      "unemployment",
      "interest rate",
      "recession",
      "central bank",
      "economy",
      "trade",
      "tariff",
    ],
  },
  {
    topic: "business-finance",
    keywords: [
      "market",
      "stocks",
      "crypto",
      "bitcoin",
      "earnings",
      "merger",
      "ipo",
      "startup",
      "investor",
      "bank",
    ],
  },
  {
    topic: "technology",
    keywords: [
      "ai",
      "artificial intelligence",
      "software",
      "chip",
      "semiconductor",
      "tech",
      "robot",
      "cyber",
      "quantum",
    ],
  },
  {
    topic: "science-health",
    keywords: [
      "health",
      "disease",
      "vaccine",
      "outbreak",
      "study",
      "research",
      "hospital",
      "science",
      "space",
      "nasa",
    ],
  },
  {
    topic: "climate-environment",
    keywords: [
      "climate",
      "wildfire",
      "flood",
      "drought",
      "hurricane",
      "emissions",
      "environment",
      "heatwave",
      "earthquake",
    ],
  },
  {
    topic: "sports",
    keywords: [
      "match",
      "tournament",
      "championship",
      "league",
      "olympic",
      "world cup",
      "football",
      "soccer",
      "nba",
    ],
  },
  {
    topic: "society-culture",
    keywords: [
      "film",
      "music",
      "celebrity",
      "festival",
      "award",
      "culture",
      "art",
      "religion",
      "protest",
    ],
  },
];

function buildHaystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
}

export function deriveRegionsFromText(parts: Array<string | null | undefined>): GeoRegion[] {
  const haystack = buildHaystack(parts);
  if (!haystack) return [DEFAULT_REGION];

  const regions = REGION_KEYWORDS.filter(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword)),
  ).map(({ region }) => region);

  return regions.length > 0 ? [...new Set(regions)] : [DEFAULT_REGION];
}

export function deriveTopicFromText(parts: Array<string | null | undefined>): Topic {
  const haystack = buildHaystack(parts);
  if (!haystack) return "other";

  const match = TOPIC_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword)),
  );
  return match?.topic ?? "other";
}
