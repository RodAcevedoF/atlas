import { MARKET_CATEGORIES, MARKET_STATUSES } from "@atlas/domain";
import { Card } from "@atlas/ui";
import {
  formatCompactCurrency,
  formatDate,
  toTitleCase,
  topOutcomeLabel,
} from "../../common/utils/index.ts";
import type {
  MarketCategory,
  MarketRecord,
  MarketStatus,
} from "../../repositories/market-repository.ts";
import { CategoryBadge, StatusBadge } from "./badges.tsx";

const COLUMNS = "grid-cols-[minmax(0,1fr)_96px_88px_116px_92px_104px]";

const SELECT_CLASS =
  "h-[31px] cursor-pointer appearance-none rounded-[9px] border border-border-strong bg-card-2 pl-[11px] pr-7 text-xs text-foreground";
const SELECT_ARROW =
  "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%238b8e95%22 stroke-width=%222%22><path d=%22M3 5l3 3 3-3%22/></svg>')] bg-[length:12px] bg-[right_9px_center] bg-no-repeat";

interface MarketsTableProps {
  markets: MarketRecord[];
  category: MarketCategory | "";
  status: MarketStatus | "";
  onCategoryChange: (value: MarketCategory | "") => void;
  onStatusChange: (value: MarketStatus | "") => void;
  isLoading: boolean;
}

export function MarketsTable({
  markets,
  category,
  status,
  onCategoryChange,
  onStatusChange,
  isLoading,
}: MarketsTableProps) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-3.5">
        <div>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Signals
          </span>
          <div className="mt-[3px] text-sm font-semibold tracking-[-0.01em]">
            Markets{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              · {markets.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={`${SELECT_CLASS} ${SELECT_ARROW}`}
            value={category}
            onChange={(event) => onCategoryChange(event.target.value as MarketCategory | "")}
          >
            <option value="">All categories</option>
            {MARKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {toTitleCase(value)}
              </option>
            ))}
          </select>
          <select
            className={`${SELECT_CLASS} ${SELECT_ARROW}`}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as MarketStatus | "")}
          >
            <option value="">All status</option>
            {MARKET_STATUSES.map((value) => (
              <option key={value} value={value}>
                {toTitleCase(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={`grid flex-none ${COLUMNS} gap-2.5 border-b border-border px-4 py-[9px] text-[10px] uppercase tracking-[0.1em] text-muted-foreground`}
      >
        <span>Market</span>
        <span>Category</span>
        <span>Status</span>
        <span>Top outcome</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Resolves</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {markets.length === 0 ? (
          <div className="p-10 text-center text-[12.5px] text-muted-foreground">
            {isLoading ? "Loading markets…" : "No markets match these filters."}
          </div>
        ) : (
          markets.map((market) => (
            <div
              key={market.id}
              className={`grid ${COLUMNS} items-center gap-2.5 border-b border-white/[0.045] px-4 py-[11px] transition-colors hover:bg-white/[0.025]`}
            >
              <span className="line-clamp-2 text-[12.5px] font-medium leading-[1.3]">
                {market.title}
              </span>
              <span>
                <CategoryBadge category={market.category} />
              </span>
              <span>
                <StatusBadge status={market.status} />
              </span>
              <span className="font-mono text-xs text-foreground">{topOutcomeLabel(market)}</span>
              <span className="text-right font-mono text-[12.5px]">
                {formatCompactCurrency(market.volumeUsd)}
              </span>
              <span className="text-right font-mono text-[11.5px] text-muted-foreground">
                {formatDate(market.resolvesAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
