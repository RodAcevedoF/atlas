import { Button } from "@atlas/ui";
import { useState } from "react";
import { useAuth } from "../auth-provider.tsx";

type ResendState = "idle" | "sending" | "sent" | "error";

export function VerifyBanner() {
  const { user, resendVerification } = useAuth();
  const [resendState, setResendState] = useState<ResendState>("idle");

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setResendState("sending");
    try {
      await resendVerification();
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[12.5px] text-foreground">
      <span>
        Verify your email to run world scans. We sent a link to <strong>{user.email}</strong>.
      </span>
      {resendState === "sent" ? (
        <span className="text-muted-foreground">Link sent.</span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={resendState === "sending"}
          onClick={() => void resend()}
        >
          {resendState === "sending" ? "Sending…" : "Resend link"}
        </Button>
      )}
      {resendState === "error" ? (
        <span className="text-destructive">Couldn't send — try again.</span>
      ) : null}
    </div>
  );
}
