import { cn } from "@atlas/ui";

/** Pill container shared by the segmented button control and the nav-tab variant. */
export const SEGMENT_GROUP =
  "flex items-center gap-0.5 rounded-[11px] border border-border bg-muted p-0.75";

export function segmentItemClass(isActive: boolean): string {
  return cn(
    "flex h-6.75 items-center rounded-lg px-3.25 text-xs font-medium transition-colors",
    isActive
      ? "atlas-segment-active text-foreground"
      : "text-muted-foreground hover:text-foreground",
  );
}

interface SegmentedControlProps<TId extends string> {
  items: ReadonlyArray<{ id: TId; label: string }>;
  activeId: TId;
  onSelect: (id: TId) => void;
  className?: string;
}

export function SegmentedControl<TId extends string>({
  items,
  activeId,
  onSelect,
  className,
}: SegmentedControlProps<TId>) {
  return (
    <div className={cn(SEGMENT_GROUP, className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.id === activeId}
          onClick={() => onSelect(item.id)}
          className={segmentItemClass(item.id === activeId)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
