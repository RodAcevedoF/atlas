import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadTopicSnapshots } from "../infra/store/intelligence.commands.ts";
import { selectIntelligence } from "../infra/store/intelligence.slice.ts";
import type { TopicSnapshotRecord } from "../repositories/market-repository.ts";

export interface UseTopicSnapshotsResult {
  snapshots: TopicSnapshotRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useTopicSnapshots(): UseTopicSnapshotsResult {
  const dispatch = useAppDispatch();
  const { snapshots, snapshotsLoading, snapshotsError } = useAppSelector(selectIntelligence);

  useEffect(() => {
    void dispatch(loadTopicSnapshots({ limit: 10 }));
  }, [dispatch]);

  return { snapshots, isLoading: snapshotsLoading, error: snapshotsError };
}
