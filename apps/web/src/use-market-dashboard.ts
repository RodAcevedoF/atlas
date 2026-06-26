import { useEffect, useState } from "react";
import { useMarketRepository } from "./providers.tsx";
import type { MarketCategory, MarketStatus } from "./repositories/market-repository.ts";
import {
  type MarketDashboardData,
  loadMarketDashboard,
} from "./use-cases/load-market-dashboard.ts";
import { syncMarketSnapshot } from "./use-cases/sync-market-snapshot.ts";
import { syncNewsSnapshot } from "./use-cases/sync-news-snapshot.ts";

export interface UseMarketDashboardResult {
  category: MarketCategory | "";
  setCategory: (value: MarketCategory | "") => void;
  status: MarketStatus | "";
  setStatus: (value: MarketStatus | "") => void;
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
  const [dashboard, setDashboard] = useState<MarketDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingNews, setIsSyncingNews] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadMarketDashboard(repository, {
          markets: {
            status: status || undefined,
            category: category || undefined,
            limit: 24,
          },
          events: { limit: 6 },
          regionSummary: {
            status: status || undefined,
            category: category || undefined,
            limit: 8,
          },
          worldTopics: { limit: 8 },
        });
        if (!cancelled) setDashboard(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [category, refreshKey, repository, status]);

  async function handleSync(): Promise<void> {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncMarketSnapshot(repository, {
        categories: category ? [category] : undefined,
        maxMarkets: 100,
      });
      setSyncMessage(`Synced ${result.upserted} markets from Polymarket.`);
      setRefreshKey((value) => value + 1);
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
      setRefreshKey((value) => value + 1);
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
