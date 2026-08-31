import { CTA_OUTLINE, Eyebrow, PANEL_GLASS } from "@/shared/ui";
import { Button, cn, useToast } from "@atlas/ui";
import { X } from "lucide-react";
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
    <div className={cn(PANEL_GLASS, "fixed bottom-6 right-6 z-40 flex w-76 flex-col gap-2.5 p-4")}>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow variant="meta">verify your email</Eyebrow>
        <button
          type="button"
          aria-label="Hide the verification reminder"
          onClick={() => setIsDismissed(true)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-coverage/[0.14] hover:text-foreground"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      </div>

      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Confirm your address before starting an inquiry. We sent a link to{" "}
        <strong className="font-medium text-card-foreground">{user.email}</strong>.
      </p>

      <Button
        variant={null}
        size="pillSm"
        disabled={isSending}
        onClick={() => void resend()}
        className={cn(CTA_OUTLINE, "self-start")}
      >
        {isSending ? "Sending…" : "Resend link"}
      </Button>
    </div>
  );
}
