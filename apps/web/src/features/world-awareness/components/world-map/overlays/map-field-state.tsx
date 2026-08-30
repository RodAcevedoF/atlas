import { EvidenceFlow } from "@/shared/brand";
import { PANEL_GLASS } from "@/shared/ui";
import { cn } from "@atlas/ui";

interface MapFieldStateProps {
  isPainting: boolean;
  isResolving: boolean;
  hasLatestRun: boolean;
  isLoading: boolean;
  hasError: boolean;
}

function stateCopy(isLoading: boolean, isResolving: boolean): string {
  if (isResolving) return "Locating this run's claims…";
  if (isLoading) return "Loading your recent research…";
  return "Ask a question to place its claims on the map.";
}

export function MapFieldState({
  isPainting,
  isResolving,
  hasLatestRun,
  isLoading,
  hasError,
}: MapFieldStateProps) {
  if (isPainting || hasError) return null;

  const isActive = isLoading || isResolving;
  if (!isActive && hasLatestRun) return null;

  const copy = stateCopy(isLoading, isResolving);

  return (
    <div className="pointer-events-none absolute left-1/2 top-[54%] z-5 w-72 -translate-x-1/2 -translate-y-1/2">
      <div className={cn(PANEL_GLASS, "atlas4-reveal p-4")}>
        <EvidenceFlow active={isActive} />
        <p className="mt-3 text-center text-[12.5px] leading-relaxed text-muted-foreground">
          {copy}
        </p>
      </div>
    </div>
  );
}
