import type { Topic } from "./signal.ts";

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
    keywords: ["israel", "iran", "gaza", "saudi", "qatar", "uae", "lebanon", "syria"],
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
      "attacked",
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
      "voted",
      "voting",
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
      "stock",
      "crypto",
      "cryptocurrency",
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
      "technology",
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

const POSITIVE_KEYWORDS: readonly string[] = [
  "win",
  "won",
  "winning",
  "victory",
  "growth",
  "recovery",
  "peace",
  "agreement",
  "breakthrough",
  "record high",
  "surge",
  "boost",
  "rally",
  "gain",
  "ceasefire",
  "deal reached",
  "approval",
];

const NEGATIVE_KEYWORDS: readonly string[] = [
  "crisis",
  "crash",
  "collapse",
  "war",
  "attack",
  "recession",
  "decline",
  "conflict",
  "death",
  "casualty",
  "casualties",
  "outbreak",
  "disaster",
  "layoff",
  "default",
  "unrest",
  "protest",
];

function buildHaystack(parts: Array<string | null | undefined>): string {
  const joined = parts
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return joined ? ` ${joined} ` : "";
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  return (
    haystack.includes(` ${keyword} `) ||
    haystack.includes(` ${keyword}s `) ||
    haystack.includes(` ${keyword}es `)
  );
}

export function deriveRegionsFromText(parts: Array<string | null | undefined>): GeoRegion[] {
  const haystack = buildHaystack(parts);
  if (!haystack) return [DEFAULT_REGION];

  const regions = REGION_KEYWORDS.filter(({ keywords }) =>
    keywords.some((keyword) => matchesKeyword(haystack, keyword)),
  ).map(({ region }) => region);

  return regions.length > 0 ? [...new Set(regions)] : [DEFAULT_REGION];
}

export function deriveTopicFromText(parts: Array<string | null | undefined>): Topic {
  const haystack = buildHaystack(parts);
  if (!haystack) return "other";

  const match = TOPIC_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => matchesKeyword(haystack, keyword)),
  );
  return match?.topic ?? "other";
}

export function classifySentimentFromText(parts: Array<string | null | undefined>): number {
  const haystack = buildHaystack(parts);
  if (!haystack) return 0;

  const positiveHits = POSITIVE_KEYWORDS.filter((keyword) =>
    matchesKeyword(haystack, keyword),
  ).length;
  const negativeHits = NEGATIVE_KEYWORDS.filter((keyword) =>
    matchesKeyword(haystack, keyword),
  ).length;
  const totalHits = positiveHits + negativeHits;
  if (totalHits === 0) return 0;

  return (positiveHits - negativeHits) / totalHits;
}
