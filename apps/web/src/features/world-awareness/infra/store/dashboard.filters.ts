import type { MarketCategory, MarketStatus, Topic } from "../../repositories/market-repository.ts";
import type { LoadMarketDashboardInput } from "../../use-cases/load-market-dashboard.ts";

export type TopicFilter = Topic | "";

export interface DashboardFilters {
  category: MarketCategory | "";
  status: MarketStatus | "";
  topic: TopicFilter;
}

export const initialDashboardFilters: DashboardFilters = {
  category: "",
  status: "active",
  topic: "",
};

export function toLoadMarketDashboardInput(filters: DashboardFilters): LoadMarketDashboardInput {
  const { category, status, topic } = filters;
  return {
    markets: { status: status || undefined, category: category || undefined, limit: 100 },
    events: { limit: 6 },
    regionSummary: { status: status || undefined, category: category || undefined, limit: 8 },
    worldTopics: { topic: topic || undefined, limit: 8 },
    worldEvents: { topic: topic || undefined, limit: 60 },
  };
}
