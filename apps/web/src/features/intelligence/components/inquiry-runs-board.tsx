import {
  InquiryHistory,
  resolveSelectedRunId,
  useDeleteInquiryRun,
  useInquiryRun,
  useRecentInquiryRuns,
} from "@/features/inquiry";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function InquiryRunsBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { runs, pinnedRunId, isLoading, error } = useRecentInquiryRuns();
  const selectedId = resolveSelectedRunId(runs, searchParams.get("run"));
  const detail = useInquiryRun(selectedId);
  const deleteRun = useDeleteInquiryRun();

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
      pinnedRunId={pinnedRunId}
      onSelect={selectRun}
      onDelete={deleteRun}
      detail={detail}
    />
  );
}
