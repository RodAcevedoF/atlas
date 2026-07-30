import type {
  MarketCategory,
  MarketStatus,
  SignalSource,
  Topic,
} from "../../repositories/market-repository.ts";
import type { LoadMarketDashboardInput } from "../../use-cases/load-market-dashboard.ts";

export type SourceFilter = SignalSource | "all";
export type TopicFilter = Topic | "";

export interface DashboardFilters {
  category: MarketCategory | "";
  status: MarketStatus | "";
  source: SourceFilter;
  topic: TopicFilter;
}

export const initialDashboardFilters: DashboardFilters = {
  category: "",
  status: "active",
  source: "all",
  topic: "",
};

export function toLoadMarketDashboardInput(filters: DashboardFilters): LoadMarketDashboardInput {
  const { category, status, source, topic } = filters;
  return {
    markets: { status: status || undefined, category: category || undefined, limit: 100 },
    events: { limit: 6 },
    regionSummary: { status: status || undefined, category: category || undefined, limit: 8 },
    worldTopics: {
      source: source === "all" ? undefined : source,
      topic: topic || undefined,
      limit: 8,
    },
    worldEvents: {
      source: source === "all" ? undefined : source,
      topic: topic || undefined,
      limit: 60,
    },
  };
}
