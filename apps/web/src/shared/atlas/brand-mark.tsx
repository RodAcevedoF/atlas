import { cn } from "@atlas/ui";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative h-5.5 w-5.5 rounded-full border-[1.5px] border-foreground">
        <span className="absolute left-[3px] top-[3px] h-2 w-2 rounded-full bg-foreground" />
      </span>
      <span className="text-[20px] font-semibold tracking-[-0.03em]">Atlas</span>
    </div>
  );
}
