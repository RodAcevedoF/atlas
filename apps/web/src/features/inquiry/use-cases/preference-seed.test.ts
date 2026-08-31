import { expect, test } from "bun:test";
import { GEO_REGIONS, type GeoRegion, TOPICS, type Topic } from "@atlas/domain";
import { buildPreferenceSeed, offersPreferenceSeed } from "./preference-seed.ts";
import { INQUIRY_QUESTION_MAX_CHARS } from "./request-inquiry-run.ts";

interface SeedCase {
  name: string;
  topics: Topic[];
  regions: GeoRegion[];
  seed: string | null;
}

const seedCases: SeedCase[] = [
  {
    name: "saved topics and regions become one question naming every value",
    topics: ["climate-environment", "conflict"],
    regions: ["europe", "asia"],
    seed: "What is happening with climate and the environment, and conflict in Europe and Asia right now?",
  },
  {
    name: "topics alone ask what is happening without claiming a place",
    topics: ["politics"],
    regions: [],
    seed: "What is happening with politics right now?",
  },
  {
    name: "regions alone ask what is happening there without narrowing the subject",
    topics: [],
    regions: ["north-america"],
    seed: "What is happening in North America right now?",
  },
  {
    name: "three plain topics read as a list, not as a chain of ands",
    topics: ["politics", "conflict", "sports"],
    regions: [],
    seed: "What is happening with politics, conflict and sports right now?",
  },
  {
    name: "global is a scope, not a place, so it reads as around the world",
    topics: [],
    regions: ["global"],
    seed: "What is happening around the world right now?",
  },
  {
    name: "a named region is more specific than global, so global drops out",
    topics: [],
    regions: ["global", "europe"],
    seed: "What is happening in Europe right now?",
  },
  {
    name: "other names no subject, so it drops out of a question that has one",
    topics: ["other", "conflict"],
    regions: [],
    seed: "What is happening with conflict right now?",
  },
  {
    name: "preferences that say nothing seedable offer no question at all",
    topics: ["other"],
    regions: [],
    seed: null,
  },
  {
    name: "a user with no saved preferences is offered no question",
    topics: [],
    regions: [],
    seed: null,
  },
];

for (const seedCase of seedCases) {
  test(seedCase.name, () => {
    const seed = buildPreferenceSeed({ topics: seedCase.topics, regions: seedCase.regions });

    expect(seed).toBe(seedCase.seed);
  });
}

test("every saved preference at once still fits the question the inquiry API accepts", () => {
  const seed = buildPreferenceSeed({ topics: [...TOPICS], regions: [...GEO_REGIONS] });

  expect(seed).not.toBeNull();
  expect(seed?.length).toBeLessThanOrEqual(INQUIRY_QUESTION_MAX_CHARS);
});

interface OfferCase {
  name: string;
  seed: string | null;
  stage: "idle" | "ready" | "reviewing" | "interpreting";
  question: string;
  offered: boolean;
}

const offerCases: OfferCase[] = [
  {
    name: "an empty idle ask box with saved preferences is offered the seed",
    seed: "What is happening with politics right now?",
    stage: "idle",
    question: "",
    offered: true,
  },
  {
    name: "whitespace is not typed input, so the seed is still offered",
    seed: "What is happening with politics right now?",
    stage: "idle",
    question: "   ",
    offered: true,
  },
  {
    name: "a typed question is never replaced by the seed",
    seed: "What is happening with politics right now?",
    stage: "idle",
    question: "Where are wildfires burning?",
    offered: false,
  },
  {
    name: "an attachment flow owns the input, so the seed stays out of it",
    seed: "What is happening with politics right now?",
    stage: "reviewing",
    question: "",
    offered: false,
  },
  {
    name: "no seedable preference means no affordance to show",
    seed: null,
    stage: "idle",
    question: "",
    offered: false,
  },
];

for (const offerCase of offerCases) {
  test(offerCase.name, () => {
    const offered = offersPreferenceSeed({
      seed: offerCase.seed,
      stage: offerCase.stage,
      question: offerCase.question,
    });

    expect(offered).toBe(offerCase.offered);
  });
}
