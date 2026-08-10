import type { ExpressionSpecification } from "maplibre-gl";
import type { Topic } from "../../../repositories/market-repository.ts";
import { CURATED_TOPICS, TOPIC_COLOR_VAR } from "../../../utils/index.ts";
import { topicHex } from "./theme-colors.ts";

const ALL_TOPICS = Object.keys(TOPIC_COLOR_VAR) as Topic[];

function countKey(topic: Topic): string {
  return `topic_${topic}`;
}

export const CLUSTER_TOPIC_COUNTS = Object.fromEntries(
  ALL_TOPICS.map((topic) => [
    countKey(topic),
    ["+", ["case", ["==", ["get", "topic"], topic], 1, 0]],
  ]),
);

function dominates(topic: Topic): ExpressionSpecification {
  const rivals = ALL_TOPICS.filter((candidate) => candidate !== topic);
  return [
    "all",
    ...rivals.map((candidate) => [">=", ["get", countKey(topic)], ["get", countKey(candidate)]]),
  ] as unknown as ExpressionSpecification;
}

export function dominantTopicColor(): ExpressionSpecification {
  return [
    "case",
    ...CURATED_TOPICS.flatMap((topic) => [dominates(topic), topicHex(topic)]),
    topicHex("other"),
  ] as unknown as ExpressionSpecification;
}
