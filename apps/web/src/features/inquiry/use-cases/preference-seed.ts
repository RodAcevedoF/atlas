import type { GeoRegion, Topic } from "@atlas/domain";
import type { AttachmentIntentStage } from "./attachment-intent.ts";

const TOPIC_PHRASES: Record<Topic, string | null> = {
  politics: "politics",
  conflict: "conflict",
  economy: "the economy",
  "business-finance": "business and finance",
  technology: "technology",
  "science-health": "science and health",
  "climate-environment": "climate and the environment",
  "society-culture": "society and culture",
  sports: "sports",
  other: null,
};

const REGION_PHRASES: Record<GeoRegion, string | null> = {
  "north-america": "North America",
  "latin-america": "Latin America",
  europe: "Europe",
  "middle-east": "the Middle East",
  africa: "Africa",
  asia: "Asia",
  oceania: "Oceania",
  global: null,
};

const EVERYWHERE = "around the world";

export interface PreferenceSeedInput {
  topics: Topic[];
  regions: GeoRegion[];
}

interface PreferenceSeedOffer {
  seed: string | null;
  stage: AttachmentIntentStage;
  question: string;
}

function phrasesOf<T extends string>(values: T[], phrases: Record<T, string | null>): string[] {
  return values.map((value) => phrases[value]).filter((phrase) => phrase !== null);
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length < 2) return phrases.join("");
  const separator = phrases.some((phrase) => phrase.includes(" and ")) ? ", and " : " and ";
  return `${phrases.slice(0, -1).join(", ")}${separator}${phrases[phrases.length - 1]}`;
}

function placeClause(regions: string[], wantsEverywhere: boolean): string | null {
  if (regions.length > 0) return `in ${joinPhrases(regions)}`;
  return wantsEverywhere ? EVERYWHERE : null;
}

export function buildPreferenceSeed(input: PreferenceSeedInput): string | null {
  const topics = phrasesOf(input.topics, TOPIC_PHRASES);
  const regions = phrasesOf(input.regions, REGION_PHRASES);
  const wantsEverywhere = regions.length === 0 && input.regions.includes("global");
  const subject = topics.length > 0 ? `with ${joinPhrases(topics)}` : null;
  const place = placeClause(regions, wantsEverywhere);
  const clauses = [subject, place].filter((clause) => clause !== null);
  if (clauses.length === 0) return null;

  return `What is happening ${clauses.join(" ")} right now?`;
}

export function offersPreferenceSeed(offer: PreferenceSeedOffer): boolean {
  return offer.seed !== null && offer.stage === "idle" && offer.question.trim() === "";
}
