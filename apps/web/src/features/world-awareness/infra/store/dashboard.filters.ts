import type { Topic } from "../../repositories/world-repository.ts";
import type { LoadWorldDashboardInput } from "../../use-cases/load-world-dashboard.ts";

export type TopicFilter = Topic | "";

export const INITIAL_TOPIC: TopicFilter = "";

export function toLoadWorldDashboardInput(topic: TopicFilter): LoadWorldDashboardInput {
  return {
    worldTopics: { topic: topic || undefined, limit: 8 },
    worldEvents: { topic: topic || undefined, limit: 60 },
  };
}
