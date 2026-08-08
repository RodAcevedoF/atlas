import type { TopicFilter } from "../infra/store/dashboard.filters.ts";
import { TOPIC_COLOR_VAR } from "../utils/index.ts";

/** Categorical dot carrying a topic's colour; the all-topics filter falls back to the accent. */
export function TopicDot({ topic }: { topic: TopicFilter }) {
  return (
    <span
      className="h-2 w-2 flex-none rounded-full"
      style={{ background: topic === "" ? "var(--primary)" : TOPIC_COLOR_VAR[topic] }}
      aria-hidden="true"
    />
  );
}
