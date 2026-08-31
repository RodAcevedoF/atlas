import { EvidenceFlow } from "@/shared/brand/evidence-flow.tsx";
import { cn } from "@atlas/ui";
import type { ReactNode } from "react";

type AsyncStateActivity = "active" | "idle";

interface AsyncStateProps {
  children: ReactNode;
  activity?: AsyncStateActivity;
  tone?: "default" | "error";
  className?: string;
  flowClassName?: string;
}

export function AsyncState({
  children,
  activity,
  tone = "default",
  className,
  flowClassName,
}: AsyncStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "atlas4-reveal flex items-center gap-5 text-[14px] text-muted-foreground",
        tone === "error" && "text-destructive",
        className,
      )}
    >
      {activity ? (
        <EvidenceFlow
          active={activity === "active"}
          className={cn("w-32 shrink-0", flowClassName)}
        />
      ) : null}
      <div>{children}</div>
    </div>
  );
}
