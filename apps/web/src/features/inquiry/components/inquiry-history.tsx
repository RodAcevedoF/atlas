import { useAuth } from "@/features/auth/auth-provider.tsx";
import { AsyncState, PANEL, PANEL_HEAD, eyebrowVariants } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseInquiryRunResult } from "../hooks/use-inquiry-run.ts";
import { mayDeleteRun } from "../may-delete-run.ts";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";
import { RunDetail } from "./run-detail.tsx";
import { RunList } from "./run-list.tsx";

const LOADING = "Loading your inquiry runs…";
const LOADING_RUN = "Loading this run…";
const EMPTY = "No inquiry runs yet.";

const RAIL_HEAD_CLASS = cn(eyebrowVariants({ variant: "meta" }), PANEL_HEAD);

interface InquiryHistoryProps {
  runs: InquiryRunSummaryRecord[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  pinnedRunId: string | null;
  onSelect: (runId: string) => void;
  onDelete: (runId: string) => void;
  detail: UseInquiryRunResult;
}

function Notice({ children, activity }: { children: ReactNode; activity?: "active" | "idle" }) {
  return (
    <div className="flex h-full items-center justify-center px-8.5 py-7">
      <Card className={cn(PANEL, "w-full max-w-md p-6")}>
        <AsyncState activity={activity}>{children}</AsyncState>
      </Card>
    </div>
  );
}

function DetailPane({
  detail,
  onDelete,
}: {
  detail: UseInquiryRunResult;
  onDelete: (() => void) | null;
}) {
  if (detail.run) return <RunDetail key={detail.run.id} run={detail.run} onDelete={onDelete} />;
  if (detail.error) return <p className="text-[14px] text-destructive">{detail.error}</p>;
  return (
    <div className="flex h-full items-center justify-center">
      <AsyncState
        activity="active"
        className="w-full max-w-sm flex-col items-stretch gap-4"
        flowClassName="w-full"
      >
        {LOADING_RUN}
      </AsyncState>
    </div>
  );
}

export function InquiryHistory({
  runs,
  isLoading,
  error,
  selectedId,
  pinnedRunId,
  onSelect,
  onDelete,
  detail,
}: InquiryHistoryProps) {
  const { user } = useAuth();
  const selectedRun = runs.find((run) => run.id === selectedId) ?? null;
  const deletableId =
    selectedRun && mayDeleteRun({ run: selectedRun, deleter: user, pinnedRunId })
      ? selectedRun.id
      : null;
  const deleteSelected = deletableId === null ? null : () => onDelete(deletableId);

  if (runs.length === 0 && error) {
    return (
      <Notice>
        <span className="text-destructive">{error}</span>
      </Notice>
    );
  }

  if (runs.length === 0 && isLoading) return <Notice activity="active">{LOADING}</Notice>;

  if (runs.length === 0) {
    return (
      <Notice activity="idle">
        {EMPTY}{" "}
        <Link to="/world" className="text-primary underline-offset-2 hover:underline">
          Ask the map a question
        </Link>{" "}
        and it lands here.
      </Notice>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-8.5 py-7">
      {error ? (
        <Card className={cn(PANEL, "px-5 py-3 text-[13px] text-destructive")}>{error}</Card>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <Card className={cn(PANEL, "flex w-80 shrink-0 flex-col overflow-hidden")}>
          <div className={RAIL_HEAD_CLASS}>
            <span>inquiry runs</span>
            <span className="tabular-nums text-conviction">{runs.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <RunList runs={runs} selectedId={selectedId} onSelect={onSelect} />
          </div>
        </Card>

        <Card className={cn(PANEL, "flex min-w-0 flex-1 flex-col overflow-hidden")}>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6.5">
            <DetailPane detail={detail} onDelete={deleteSelected} />
          </div>
        </Card>
      </div>
    </div>
  );
}
