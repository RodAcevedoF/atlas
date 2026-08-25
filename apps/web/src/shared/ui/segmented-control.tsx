import { cn } from "@atlas/ui";

/** Pill container shared by the segmented button control and the nav-tab variant. */
export const SEGMENT_GROUP =
  "flex items-center gap-0.5 rounded-full border border-border bg-coverage/[0.05] p-1";

export function segmentItemClass(isActive: boolean): string {
  return cn(
    "flex h-7 items-center rounded-full px-4 text-[12.5px] font-medium transition-colors",
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
