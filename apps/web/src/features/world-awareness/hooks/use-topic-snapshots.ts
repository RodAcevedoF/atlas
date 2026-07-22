import { useMarketRepository } from "@/providers.tsx";
import { useEffect, useState } from "react";
import type { TopicSnapshotRecord } from "../repositories/market-repository.ts";
import { listWorldSnapshots } from "../use-cases/list-world-snapshots.ts";

export interface UseTopicSnapshotsResult {
  snapshots: TopicSnapshotRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useTopicSnapshots(): UseTopicSnapshotsResult {
  const repository = useMarketRepository();
  const [snapshots, setSnapshots] = useState<TopicSnapshotRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = { cancelled: false };

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listWorldSnapshots(repository, { limit: 10 });
        if (!token.cancelled) setSnapshots(result);
      } catch (loadError) {
        if (!token.cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load snapshots");
        }
      } finally {
        if (!token.cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      token.cancelled = true;
    };
  }, [repository]);

  return { snapshots, isLoading, error };
}
