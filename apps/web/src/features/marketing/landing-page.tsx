import { useAuth } from "@/features/auth/auth-provider.tsx";
import { ActConviction } from "./components/act-conviction.tsx";
import { ActCoverage } from "./components/act-coverage.tsx";
import { ActTheGap } from "./components/act-the-gap.tsx";
import { ClosingFooter } from "./components/closing-footer.tsx";
import { HeroPremise } from "./components/hero-premise.tsx";
import { LeftRail } from "./components/left-rail.tsx";
import { Masthead } from "./components/masthead.tsx";
import { SnapshotArtifact } from "./components/snapshot-artifact.tsx";
import { Ticker } from "./components/ticker.tsx";

/** Public editorial landing (AT-044) — a "newspaper edition" of coverage × conviction. */
export function LandingPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";
  const enterHref = isAuthed ? "/app" : "/register";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground md:pl-13.5">
      <LeftRail />
      <Ticker />
      <Masthead enterHref={enterHref} isAuthed={isAuthed} />
      <HeroPremise />
      <ActCoverage />
      <ActConviction />
      <ActTheGap />
      <SnapshotArtifact enterHref={enterHref} />
      <ClosingFooter enterHref={enterHref} />
    </div>
  );
}
