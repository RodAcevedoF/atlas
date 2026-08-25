import { useAuth } from "@/features/auth/auth-provider.tsx";
import { Eyebrow } from "@/shared/ui";
import { Button, cn } from "@atlas/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { homeDestination } from "./home-destination.ts";

export type ErrorTone = "info" | "warning" | "negative";

const TONE_CLASSES: Record<ErrorTone, { ring: string; halo: string; glyph: string }> = {
  info: { ring: "border-info/30", halo: "bg-info/25", glyph: "text-info" },
  warning: { ring: "border-warning/30", halo: "bg-warning/25", glyph: "text-warning" },
  negative: { ring: "border-negative/30", halo: "bg-negative/25", glyph: "text-negative" },
};

interface ErrorViewProps {
  code: string;
  tone: ErrorTone;
  icon: LucideIcon;
  title: string;
  message: string;
  reaching?: boolean;
  children?: ReactNode;
}

export function ErrorView({
  code,
  tone,
  icon: Glyph,
  title,
  message,
  reaching,
  children,
}: ErrorViewProps) {
  const { status } = useAuth();
  const home = homeDestination(status);
  const tones = TONE_CLASSES[tone];

  return (
    <main className="atlas4-page flex h-screen flex-col items-center justify-center px-6 text-center">
      <div className="atlas4-reveal flex flex-col items-center gap-6">
        <span
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-full border",
            tones.ring,
          )}
        >
          <span aria-hidden className={cn("absolute inset-0 rounded-full blur-2xl", tones.halo)} />
          {reaching ? (
            <span
              aria-hidden
              className={cn("atlas4-ping absolute inset-0 rounded-full border", tones.ring)}
            />
          ) : null}
          <Glyph aria-hidden strokeWidth={1.5} className={cn("relative h-6 w-6", tones.glyph)} />
        </span>

        <div className="flex flex-col items-center gap-2.5">
          <Eyebrow variant="meta" className="text-primary">
            {code}
          </Eyebrow>
          <h1 className="text-[25px] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{message}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {children}
          <Button asChild size="sm" variant="outline">
            <Link to={home.to}>{home.label}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
