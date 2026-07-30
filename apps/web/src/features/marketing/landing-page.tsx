import { useAuth } from "@/features/auth/auth-provider.tsx";
import { CURATED_TOPIC_LABELS } from "@/features/world-awareness/utils/taxonomy.ts";
import {
  ATLAS_STATS,
  AtlasHeader,
  HeaderCta,
  MarqueeBackdrop,
  SourceStrip,
  useCarousel,
  useLivePulse,
} from "@/shared/atlas";
import { useMemo } from "react";
import { HeroCarousel } from "./components/hero-carousel.tsx";
import { SLIDES } from "./data/landing-content.ts";

export function LandingPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const carousel = useCarousel({ length: SLIDES.length });
  const pulse = useLivePulse();

  const primary = isAuthed
    ? { label: "Open snapshot", href: "/app" }
    : { label: "Create account", href: "/register" };
  const secondary = isAuthed ? undefined : { label: "Log in", href: "/login" };

  const headerActions = useMemo(
    () =>
      isAuthed ? (
        <HeaderCta to="/app" variant="solid">
          Open snapshot
        </HeaderCta>
      ) : (
        <>
          <HeaderCta to="/login" variant="ghost">
            Log in
          </HeaderCta>
          <HeaderCta to="/register" variant="solid">
            Create account
          </HeaderCta>
        </>
      ),
    [isAuthed],
  );

  return (
    <div className="atlas4-page relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <MarqueeBackdrop words={CURATED_TOPIC_LABELS} />
      <AtlasHeader actions={headerActions} />

      <div className="relative z-[3] flex flex-1 items-center justify-center px-8.5 pb-6.5">
        <HeroCarousel carousel={carousel} pulse={pulse} primary={primary} secondary={secondary} />
      </div>

      <SourceStrip
        trailing={`+${ATLAS_STATS.sources.toLocaleString()} sources`}
        className="relative z-[3] px-8.5 pb-7.5"
      />
    </div>
  );
}
