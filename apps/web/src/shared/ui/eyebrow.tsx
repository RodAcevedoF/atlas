import { cn } from "@atlas/ui";

interface EyebrowProps {
  children: string;
  className?: string;
}

/** Small uppercase label that titles a card or a section inside one. */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
