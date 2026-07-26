import type { MarketCategory, MarketStatus } from "../../repositories/market-repository.ts";

const CATEGORY_VAR: Record<MarketCategory, string> = {
  politics: "var(--category-politics)",
  economics: "var(--category-economics)",
  crypto: "var(--category-crypto)",
  sports: "var(--category-sports)",
  science: "var(--category-science)",
  culture: "var(--category-culture)",
  other: "var(--category-other)",
};

const STATUS_VAR: Record<MarketStatus, string> = {
  active: "var(--status-active)",
  closed: "var(--status-closed)",
  resolved: "var(--status-resolved)",
};

function softMix(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export function CategoryBadge({ category }: { category: MarketCategory }) {
  const color = CATEGORY_VAR[category];
  return (
    <span
      className="inline-flex h-5.25 items-center rounded-md border px-2 text-[11px] font-medium capitalize"
      style={{ color, background: softMix(color, 12), borderColor: softMix(color, 22) }}
    >
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: MarketStatus }) {
  const color = STATUS_VAR[status];
  return (
    <span
      className="inline-flex h-5.25 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium capitalize"
      style={{ color, background: softMix(color, 12) }}
    >
      <span
        className="h-1.25 w-1.25 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {status}
    </span>
  );
}
