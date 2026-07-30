import { CURATED_TOPIC_LABELS } from "@/features/world-awareness/utils/taxonomy.ts";
import { AtlasHeader, HeaderCta, MarqueeBackdrop, SourceStrip, useLivePulse } from "@/shared/atlas";
import { useMemo } from "react";
import { AuthForm } from "./auth-form.tsx";
import { AuthPitchPanel } from "./auth-pitch-panel.tsx";

type Mode = "login" | "register";

export function AuthPage({ mode }: { mode: Mode }) {
  const pulse = useLivePulse();

  const headerActions = useMemo(
    () =>
      mode === "login" ? (
        <HeaderCta to="/register" variant="ghost">
          Create account
        </HeaderCta>
      ) : (
        <HeaderCta to="/login" variant="ghost">
          Log in
        </HeaderCta>
      ),
    [mode],
  );

  return (
    <div className="atlas4-page relative flex min-h-screen flex-col overflow-hidden text-foreground">
      <MarqueeBackdrop words={CURATED_TOPIC_LABELS} />

      <AtlasHeader actions={headerActions} />

      <main className="relative z-[3] flex flex-1 items-center justify-center px-8.5 pb-11">
        <div className="atlas4-panel grid w-full max-w-[1000px] overflow-hidden rounded-[22px] md:grid-cols-2">
          <AuthPitchPanel mode={mode} pulse={pulse} />
          <AuthForm mode={mode} />
        </div>
      </main>

      <SourceStrip className="relative z-[3] px-8.5 pb-7.5" />
    </div>
  );
}
