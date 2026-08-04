import { Eyebrow } from "@/shared/ui";
import { Card, cn } from "@atlas/ui";
import type { WorldScanDevelopmentRecord } from "../../repositories/market-repository.ts";
import { Citations } from "./report-body.tsx";

interface DevelopmentCardProps {
  development: WorldScanDevelopmentRecord;
  className?: string;
}

export function LeadDevelopment({ development, className }: DevelopmentCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3.5 p-6", className)}>
      <Eyebrow>{development.where}</Eyebrow>
      <h2 className="text-[27px] font-semibold leading-[1.2] tracking-[-0.02em]">
        {development.title}
      </h2>
      <p className="max-w-150 text-[14.5px] leading-[1.6] text-muted-foreground">
        {development.whyItMatters}
      </p>
      <div className="mt-auto border-t border-border pt-4">
        <Citations refs={development.citations} />
      </div>
    </Card>
  );
}

export function SideDevelopment({ development, className }: DevelopmentCardProps) {
  return (
    <Card className={cn("flex flex-col gap-2.5 p-5", className)}>
      <Eyebrow>{development.where}</Eyebrow>
      <h3 className="text-[16.5px] font-semibold leading-[1.32] tracking-[-0.01em]">
        {development.title}
      </h3>
      <p className="text-[13px] leading-[1.55] text-muted-foreground">{development.whyItMatters}</p>
      <div className="mt-auto pt-3">
        <Citations refs={development.citations} />
      </div>
    </Card>
  );
}
