import { cn } from "@atlas/ui";
import type { ReactNode } from "react";

/**
 * Shell for the map's side panels: fixed width, capped height, one scrolling body between a
 * fixed header and an optional footer. Composed rather than configured — each part is placed by
 * the caller, so a panel can skip the footer or swap the body for an empty state.
 */
export function DetailPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex max-h-[70vh] w-93 flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {children}
    </aside>
  );
}

export function DetailPanelHeader({ children }: { children: ReactNode }) {
  return <div className="border-b border-border px-4.25 pb-3 pt-3.5">{children}</div>;
}

interface DetailPanelBodyProps {
  className?: string;
  children: ReactNode;
}

export function DetailPanelBody({ className, children }: DetailPanelBodyProps) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto px-4.25 pb-4 pt-3.5", className)}
    >
      {children}
    </div>
  );
}
