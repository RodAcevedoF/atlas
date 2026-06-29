import { cn } from "@atlas/ui";
import type { ReactNode } from "react";

interface FloatingPanelProps {
  visible: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}


export function FloatingPanel({
  visible,
  onClose,
  label,
  className,
  children,
}: FloatingPanelProps) {
  if (!visible) return null;

  return (
    <div className={cn("absolute z-10 drop-shadow-2xl", className)}>
      {children}
      <button
        type="button"
        aria-label={`Hide ${label}`}
        onClick={onClose}
        className="absolute -right-2.5 -top-2.5 z-30 flex h-5.5 w-5.5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg shadow-black/40 transition-colors hover:text-foreground"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
