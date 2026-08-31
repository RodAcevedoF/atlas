import { cn } from "@atlas/ui";

interface BrandMarkProps {
  className?: string;
}

interface BrandSymbolProps {
  className?: string;
}

export function BrandSymbol({ className }: BrandSymbolProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block h-5.5 w-5.5 shrink-0 rounded-full border-[1.5px] border-current text-foreground",
        className,
      )}
    >
      <span className="absolute left-[14%] top-[14%] h-[36%] w-[36%] rounded-full bg-current" />
    </span>
  );
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandSymbol />
      <span className="text-[20px] font-semibold tracking-[-0.03em]">Atlas</span>
    </div>
  );
}
