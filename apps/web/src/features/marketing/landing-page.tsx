import { useAuth } from "@/features/auth/auth-provider.tsx";
import { CURATED_TOPIC_LABELS } from "@/features/world-awareness/utils/taxonomy.ts";
import { ATLAS_STATS, HeaderCta, PublicPage, useCarousel, useLivePulse } from "@/shared/brand";
import { useMemo } from "react";
import { HeroCarousel } from "./components/hero-carousel.tsx";
import { SLIDES } from "./data/landing-content.ts";

export function LandingPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const carousel = useCarousel({ length: SLIDES.length });
  const pulse = useLivePulse();

  const headerActions = useMemo(
    () =>
      isAuthed ? (
        <HeaderCta to="/world" variant="solid">
          Return to map
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
    <PublicPage
      backdropWords={CURATED_TOPIC_LABELS}
      headerActions={headerActions}
      sourceStripTrailing={`+${ATLAS_STATS.sources.toLocaleString()} sources`}
    >
      <div className="relative z-3 flex flex-1 items-center justify-center px-8.5 pb-6.5">
        <HeroCarousel carousel={carousel} pulse={pulse} />
      </div>
    </PublicPage>
  );
}
