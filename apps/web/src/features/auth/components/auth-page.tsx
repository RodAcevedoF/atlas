import { CURATED_TOPIC_LABELS } from "@/features/world-awareness/utils/taxonomy.ts";
import { HeaderCta, PublicPage, useLivePulse } from "@/shared/brand";
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
    <PublicPage backdropWords={CURATED_TOPIC_LABELS} headerActions={headerActions}>
      <main className="relative z-3 flex flex-1 items-center justify-center px-8.5 pb-11">
        <div className="atlas4-panel grid w-full max-w-250 overflow-hidden rounded-[22px] md:grid-cols-2">
          <AuthPitchPanel mode={mode} pulse={pulse} />
          <AuthForm mode={mode} />
        </div>
      </main>
    </PublicPage>
  );
}
