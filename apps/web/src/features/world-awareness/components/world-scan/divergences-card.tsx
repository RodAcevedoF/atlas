import { Eyebrow } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import type { WorldScanDivergenceRecord } from "../../repositories/market-repository.ts";
import { Citations } from "./report-body.tsx";

interface DivergencesCardProps {
  divergences: WorldScanDivergenceRecord[];
  className?: string;
}

function DivergenceRow({ divergence }: { divergence: WorldScanDivergenceRecord }) {
  return (
    <div className="flex flex-col gap-1.75 border-b border-border py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="text-[13px] leading-[1.4] text-foreground">{divergence.topic}</span>
        <Eyebrow variant="meta" className="whitespace-nowrap">
          {divergence.region}
        </Eyebrow>
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">
        <span className="text-coverage">Attention </span>
        {divergence.attention}
      </p>
      <p className="text-[12px] leading-snug text-muted-foreground">
        <span className="text-conviction">Expectation </span>
        {divergence.expectation}
      </p>
      <p className="text-[12px] leading-snug text-primary">{divergence.read}</p>
      <Citations refs={divergence.citations} />
    </div>
  );
}

export function DivergencesCard({ divergences, className }: DivergencesCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3.5 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Where markets disagree</Eyebrow>
        <Eyebrow variant="meta">{divergences.length} movers</Eyebrow>
      </div>
      <div className="flex flex-col">
        {divergences.map((divergence) => (
          <DivergenceRow key={`${divergence.topic}-${divergence.region}`} divergence={divergence} />
        ))}
      </div>
    </Card>
  );
}
