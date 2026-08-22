import { canPaintDistribution } from "@/features/world-awareness/components/world-map/utils/awareness-points.ts";
import { Eyebrow } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, cn } from "@atlas/ui";
import { Link } from "react-router-dom";
import type {
  AwarenessConfidence,
  CountryAwarenessRecord,
  ResearchRunRecord,
} from "../repositories/research-repository.ts";
import { RUN_STATUS_LABEL, runStatusClass } from "./run-status.ts";

const NO_QUERY = "No query was produced for this run.";
const NO_SYNTHESIS = "No synthesis for this run.";
const NO_DISTRIBUTION = "This run measured no country.";

const CONFIDENCE_CLASS: Record<AwarenessConfidence, string> = {
  measured: "text-card-foreground",
  thin: "text-muted-foreground",
  artifact: "text-faint",
};

function DistributionRow({ country }: { country: CountryAwarenessRecord }) {
  return (
    <tr className="border-t border-border">
      <td className={cn("py-1.5 pr-3", CONFIDENCE_CLASS[country.confidence])}>{country.country}</td>
      <td className="py-1.5 pr-3 text-right font-mono tabular-nums">
        {country.awareness.toFixed(2)}%
      </td>
      <td className="py-1.5 pr-3 text-muted-foreground">{country.confidence}</td>
      <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">
        {country.coveredBuckets}/{country.totalBuckets}
      </td>
    </tr>
  );
}

function Distribution({ distribution }: { distribution: CountryAwarenessRecord[] }) {
  if (distribution.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{NO_DISTRIBUTION}</p>;
  }

  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pb-1.5 pr-3 font-medium">Country</th>
          <th className="pb-1.5 pr-3 text-right font-medium">Share of its output</th>
          <th className="pb-1.5 pr-3 font-medium">Confidence</th>
          <th className="pb-1.5 text-right font-medium">Buckets covered</th>
        </tr>
      </thead>
      <tbody>
        {distribution.map((country) => (
          <DistributionRow key={country.country} country={country} />
        ))}
      </tbody>
    </table>
  );
}

export function RunDetail({ run }: { run: ResearchRunRecord }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>Run · {run.window} window</Eyebrow>
          <h2 className="text-[15px] font-semibold leading-snug text-card-foreground">
            {run.question}
          </h2>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
            {formatRelativeTime(run.createdAt)}
            <span className={runStatusClass(run.status)}>· {RUN_STATUS_LABEL[run.status]}</span>
          </span>
        </div>

        {canPaintDistribution(run.distribution) ? (
          <Button asChild size="sm" variant="secondary">
            <Link to={`/world?run=${encodeURIComponent(run.id)}`}>Show on map</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>Executed query</Eyebrow>
        <p
          className={cn(
            "rounded-lg border border-border bg-muted/45 px-3 py-2 font-mono text-[11.5px] leading-relaxed",
            run.executedQuery ? "text-card-foreground" : "text-muted-foreground",
          )}
        >
          {run.executedQuery ?? NO_QUERY}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Eyebrow>Synthesis</Eyebrow>
        <p className="text-[12.5px] leading-relaxed text-card-foreground">
          {run.synthesis ?? <span className="text-muted-foreground">{NO_SYNTHESIS}</span>}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Distribution</Eyebrow>
        <Distribution distribution={run.distribution} />
      </div>
    </div>
  );
}
