import { ResearchHistory } from "@/features/research/components/research-history.tsx";
import { resolveSelectedRunId } from "@/features/research/components/selected-run.ts";
import { useRecentResearchRuns } from "@/features/research/hooks/use-recent-research-runs.ts";
import { useResearchRun } from "@/features/research/hooks/use-research-run.ts";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function ResearchRunsBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { runs, isLoading, error } = useRecentResearchRuns();
  const selectedId = resolveSelectedRunId(runs, searchParams.get("run"));
  const detail = useResearchRun(selectedId);

  const selectRun = useCallback(
    (runId: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("run", runId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <ResearchHistory
      runs={runs}
      isLoading={isLoading}
      error={error}
      selectedId={selectedId}
      onSelect={selectRun}
      detail={detail}
    />
  );
}
