import { Button, useToast } from "@atlas/ui";
import { useState } from "react";
import { useAuth } from "../auth-provider.tsx";

export function VerifyBanner() {
  const { user, resendVerification } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  if (!user || user.emailVerified) return null;

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
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-[12.5px] text-foreground">
      <span>
        Verify your email to run world scans. We sent a link to <strong>{user.email}</strong>.
      </span>
      <Button size="sm" variant="outline" disabled={isSending} onClick={() => void resend()}>
        {isSending ? "Sending…" : "Resend link"}
      </Button>
    </div>
  );
}
