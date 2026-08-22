import { Eyebrow } from "@/shared/ui";
import { Button, useToast } from "@atlas/ui";
import { useState } from "react";
import { useAuth } from "../auth-provider.tsx";

export function VerifyEmailCard() {
  const { user, resendVerification } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!user || user.emailVerified || isDismissed) return null;

  const resend = async () => {
    setIsSending(true);
    try {
      await resendVerification();
      toast("Verification link sent.", "success");
    } catch {
      toast("Couldn't send the link — try again.", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex w-72 flex-col gap-2 rounded-xl border border-border bg-card/86 p-3.5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>Verify your email</Eyebrow>
        <button
          type="button"
          aria-label="Hide the verification reminder"
          onClick={() => setIsDismissed(true)}
          className="text-muted-foreground transition-colors hover:text-card-foreground"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Confirm your address so we know it's you. We sent a link to{" "}
        <strong className="font-medium text-card-foreground">{user.email}</strong>.
      </p>

      <Button
        size="sm"
        variant="outline"
        disabled={isSending}
        onClick={() => void resend()}
        className="self-start"
      >
        {isSending ? "Sending…" : "Resend link"}
      </Button>
    </div>
  );
}
