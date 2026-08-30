import { useAdminRepository } from "@/features/admin/admin-provider.tsx";
import type { AdminAnalyticsRecord } from "@/features/admin/repositories/admin-repository.ts";
import { makeLoadAdminAnalytics } from "@/features/admin/use-cases/load-admin-analytics.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseAdminAnalyticsResult {
  analytics: AdminAnalyticsRecord | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const repository = useAdminRepository();
  const load = useMemo(() => makeLoadAdminAnalytics(repository), [repository]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setIsLoading(true);
    try {
      const result = await load();
      if (currentRequest !== requestId.current) return;
      setAnalytics(result);
      setError(null);
    } catch (caught) {
      if (currentRequest !== requestId.current) return;
      setError(caught instanceof Error ? caught.message : "Could not load analytics");
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return { analytics, isLoading, error, refresh };
}
