import { useAdminRepository } from "@/features/admin/admin-provider.tsx";
import type { AdminAnalyticsRecord } from "@/features/admin/repositories/admin-repository.ts";
import { makeLoadAdminAnalytics } from "@/features/admin/use-cases/load-admin-analytics.ts";
import { useEffect, useMemo, useState } from "react";

export interface UseAdminAnalyticsResult {
  analytics: AdminAnalyticsRecord | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const repository = useAdminRepository();
  const load = useMemo(() => makeLoadAdminAnalytics(repository), [repository]);
  const [analytics, setAnalytics] = useState<AdminAnalyticsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void load()
      .then((result) => {
        if (cancelled) return;
        setAnalytics(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : "Could not load analytics");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { analytics, isLoading, error };
}
