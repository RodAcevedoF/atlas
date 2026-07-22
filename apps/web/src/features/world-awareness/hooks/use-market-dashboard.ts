import { useMarketRepository } from "@/providers.tsx";
import { useCallback, useEffect, useState } from "react";
import type {
  MarketCategory,
  MarketStatus,
  SignalSource,
  Topic,
} from "../repositories/market-repository.ts";

export type SourceFilter = SignalSource | "all";
export type TopicFilter = Topic | "";
import {
  type MarketDashboardData,
  loadMarketDashboard,
} from "../use-cases/load-market-dashboard.ts";
import { syncMarketSnapshot } from "../use-cases/sync-market-snapshot.ts";
import { syncNewsSnapshot } from "../use-cases/sync-news-snapshot.ts";

export interface UseMarketDashboardResult {
  category: MarketCategory | "";
  setCategory: (value: MarketCategory | "") => void;
  status: MarketStatus | "";
  setStatus: (value: MarketStatus | "") => void;
  source: SourceFilter;
  setSource: (value: SourceFilter) => void;
  topic: TopicFilter;
  setTopic: (value: TopicFilter) => void;
  dashboard: MarketDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  isSyncingNews: boolean;
  error: string | null;
  syncMessage: string | null;
  handleSync: () => Promise<void>;
  handleSyncNews: () => Promise<void>;
}

export function useMarketDashboard(): UseMarketDashboardResult {
  const repository = useMarketRepository();
  const [category, setCategory] = useState<MarketCategory | "">("");
  const [status, setStatus] = useState<MarketStatus | "">("active");
  const [source, setSource] = useState<SourceFilter>("all");
  const [topic, setTopic] = useState<TopicFilter>("");
  const [dashboard, setDashboard] = useState<MarketDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingNews, setIsSyncingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(
    async (token?: { cancelled: boolean }): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadMarketDashboard(repository, {
          markets: {
            status: status || undefined,
            category: category || undefined,
            limit: 100,
          },
          events: { limit: 6 },
          regionSummary: {
            status: status || undefined,
            category: category || undefined,
            limit: 8,
          },
          worldTopics: {
            source: source === "all" ? undefined : source,
            topic: topic || undefined,
            limit: 8,
          },
          worldEvents: { source: "news", topic: topic || undefined, limit: 20 },
        });
        if (!token?.cancelled) setDashboard(result);
      } catch (loadError) {
        if (!token?.cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
        }
      } finally {
        if (!token?.cancelled) setIsLoading(false);
      }
    },
    [category, repository, status, source, topic],
  );

  useEffect(() => {
    const token = { cancelled: false };
    void load(token);

    return () => {
      token.cancelled = true;
    };
  }, [load]);

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncMarketSnapshot(repository, {
        categories: category ? [category] : undefined,
        maxMarkets: 100,
      });
      setSyncMessage(`Synced ${result.upserted} markets from Polymarket.`);
      void load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to sync market snapshot");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleSyncNews(): Promise<void> {
    setIsSyncingNews(true);
    setError(null);

    try {
      const result = await syncNewsSnapshot(repository, { limit: 75 });
      setSyncMessage(`Ingested ${result.upserted} news signals from GDELT.`);
      void load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Failed to sync news snapshot");
    } finally {
      setIsSyncingNews(false);
    }
  }

  return {
    category,
    setCategory,
    status,
    setStatus,
    source,
    setSource,
    topic,
    setTopic,
    dashboard,
    isLoading,
    isSyncing,
    isSyncingNews,
    error,
    syncMessage,
    handleSync,
    handleSyncNews,
  };
}
