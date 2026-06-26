import { Card } from "@atlas/ui";
import { formatCompactCurrency } from "../../common/utils/index.ts";

interface KpiStripProps {
  activeMarkets: number;
  totalVolumeUsd: number;
  totalLiquidityUsd: number;
  signalsIngested: number;
  isLoading: boolean;
}

interface Kpi {
  label: string;
  value: string;
}

function KpiCard({ label, value, isLoading }: Kpi & { isLoading: boolean }) {
  return (
    <Card className="px-4 pb-[13px] pt-3.5">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2.5 font-mono text-[27px] font-medium leading-none tracking-[-0.02em]">
        {isLoading ? "—" : value}
      </div>
    </Card>
  );
}

export function KpiStrip({
  activeMarkets,
  totalVolumeUsd,
  totalLiquidityUsd,
  signalsIngested,
  isLoading,
}: KpiStripProps) {
  const kpis: Kpi[] = [
    { label: "Active markets", value: String(activeMarkets) },
    { label: "Tracked volume", value: formatCompactCurrency(totalVolumeUsd) },
    { label: "Tracked liquidity", value: formatCompactCurrency(totalLiquidityUsd) },
    { label: "Signals ingested", value: signalsIngested.toLocaleString() },
  ];

  return (
    <section className="grid flex-none grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} isLoading={isLoading} />
      ))}
    </section>
  );
}
