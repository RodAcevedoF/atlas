import { Eyebrow } from "@/shared/ui";
import { Card } from "@atlas/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { UseResearchRunResult } from "../hooks/use-research-run.ts";
import type { ResearchRunSummaryRecord } from "../repositories/research-repository.ts";
import { RunDetail } from "./run-detail.tsx";
import { RunList } from "./run-list.tsx";

const LOADING = "Loading your research runs…";
const LOADING_RUN = "Loading this run…";
const EMPTY = "No research runs yet.";

interface ResearchHistoryProps {
  runs: ResearchRunSummaryRecord[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (runId: string) => void;
  detail: UseResearchRunResult;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-6">
      <Card className="p-5 text-[12.5px] text-muted-foreground">{children}</Card>
    </div>
  );
}

function DetailPane({ detail }: { detail: UseResearchRunResult }) {
  if (detail.run) return <RunDetail run={detail.run} />;
  if (detail.error) return <p className="text-[12.5px] text-destructive">{detail.error}</p>;
  return <p className="text-[12.5px] text-muted-foreground">{LOADING_RUN}</p>;
}

export function ResearchHistory({
  runs,
  isLoading,
  error,
  selectedId,
  onSelect,
  detail,
}: ResearchHistoryProps) {
  if (runs.length === 0 && error) {
    return (
      <Notice>
        <span className="text-destructive">{error}</span>
      </Notice>
    );
  }

  if (runs.length === 0 && isLoading) return <Notice>{LOADING}</Notice>;

  if (runs.length === 0) {
    return (
      <Notice>
        {EMPTY}{" "}
        <Link to="/world" className="text-primary underline-offset-2 hover:underline">
          Ask the map a question
        </Link>{" "}
        and it lands here.
      </Notice>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 px-6 py-6">
      {error ? <Card className="px-4 py-2.5 text-[12.5px] text-destructive">{error}</Card> : null}

      <div className="flex min-h-0 flex-1 gap-3.5">
        <Card className="flex w-72 shrink-0 flex-col gap-2.5 overflow-y-auto p-3.5">
          <Eyebrow>Research runs</Eyebrow>
          <RunList runs={runs} selectedId={selectedId} onSelect={onSelect} />
        </Card>

        <Card className="min-w-0 flex-1 overflow-y-auto p-5">
          <DetailPane detail={detail} />
        </Card>
      </div>
    </div>
  );
}
