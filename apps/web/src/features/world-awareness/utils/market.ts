import { formatPercent } from "@/shared/utils/index.ts";
import type { MarketRecord } from "../repositories/market-repository.ts";

export function topOutcomeLabel(market: MarketRecord): string {
  const topOutcome = [...market.outcomes].sort((left, right) => right.price - left.price)[0];
  if (!topOutcome) return "No outcome pricing yet";
  return `${topOutcome.name} ${formatPercent(topOutcome.price)}`;
}
