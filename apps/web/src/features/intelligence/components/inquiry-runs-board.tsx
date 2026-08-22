import { InquiryHistory } from "@/features/inquiry/components/inquiry-history.tsx";
import { resolveSelectedRunId } from "@/features/inquiry/components/selected-run.ts";
import { useInquiryRun } from "@/features/inquiry/hooks/use-inquiry-run.ts";
import { useRecentInquiryRuns } from "@/features/inquiry/hooks/use-recent-inquiry-runs.ts";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function InquiryRunsBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { runs, isLoading, error } = useRecentInquiryRuns();
  const selectedId = resolveSelectedRunId(runs, searchParams.get("run"));
  const detail = useInquiryRun(selectedId);

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
    <InquiryHistory
      runs={runs}
      isLoading={isLoading}
      error={error}
      selectedId={selectedId}
      onSelect={selectRun}
      detail={detail}
    />
  );
}
