import type { MarketCategory, MarketStatus } from "../../repositories/market-repository.ts";

// Per-category accent colors (design palette mapped onto the app's MarketCategory taxonomy).
const CATEGORY_COLORS: Record<MarketCategory, string> = {
  politics: "#ff9d8a",
  economics: "#ffab58",
  crypto: "#c79bff",
  sports: "#5fcf80",
  science: "#6ea8fe",
  culture: "#e9a0d8",
  other: "#8b8e95",
};

const STATUS_COLORS: Record<MarketStatus, string> = {
  active: "#5fcf80",
  closed: "#ffab58",
  resolved: "#6ea8fe",
};

function withAlpha(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function CategoryBadge({ category }: { category: MarketCategory }) {
  const color = CATEGORY_COLORS[category];
  return (
    <span
      className="inline-flex h-5.25 items-center rounded-md border px-2 text-[11px] font-medium capitalize"
      style={{ color, background: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.22) }}
    >
      {category}
    </span>
  );
}

export function StatusBadge({ status }: { status: MarketStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex h-5.25 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium capitalize"
      style={{ color, background: withAlpha(color, 0.12) }}
    >
      <span
        className="h-1.25 w-1.25 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
      {status}
    </span>
  );
}
