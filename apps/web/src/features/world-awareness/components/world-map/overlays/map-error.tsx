import { PANEL_GLASS } from "@/shared/ui";
import { cn } from "@atlas/ui";

export function MapError({ message }: { message: string }) {
  return (
    <div
      className={cn(
        PANEL_GLASS,
        "max-w-md px-4.5 py-2.5 text-center text-[12.5px] leading-relaxed text-destructive",
      )}
    >
      {message}
    </div>
  );
}
