import { cn } from "@atlas/ui";

interface CarouselDotsProps {
  ids: readonly string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

export function CarouselDots({ ids, activeIndex, onSelect, className }: CarouselDotsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {ids.map((id, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={id}
            type="button"
            aria-label={`Go to ${id} slide`}
            aria-current={isActive}
            onClick={() => onSelect(index)}
            className={cn(
              "h-0.75 rounded-full transition-all duration-300",
              isActive ? "w-6.5 bg-conviction" : "w-3 bg-foreground/25 hover:bg-foreground/40",
            )}
          />
        );
      })}
    </div>
  );
}
