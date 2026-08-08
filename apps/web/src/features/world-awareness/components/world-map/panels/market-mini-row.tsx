import { formatCompactCurrency } from "@/shared/utils/index.ts";
import type { MarketRecord } from "../../../repositories/market-repository.ts";
import { topOutcomeLabel } from "../../../utils/market.ts";

/** One market as a two-line row: title over its leading outcome and traded volume. */
export function MarketMiniRow({ market }: { market: MarketRecord }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] leading-snug text-foreground/90">{market.title}</span>
      <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
        <span>{topOutcomeLabel(market)}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono">{formatCompactCurrency(market.volumeUsd)}</span>
      </div>
    </div>
  );
}
