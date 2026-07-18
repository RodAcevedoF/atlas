import { Button, Card } from "@atlas/ui";
import { useEffect, useState } from "react";
import { useAuth } from "../auth-provider.tsx";

type VerifyStatus = "verifying" | "success" | "error";

export function VerifyEmailView() {
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((caught: unknown) => {
        setStatus("error");
        setMessage(caught instanceof Error ? caught.message : "Verification failed.");
      });
  }, [verifyEmail]);

  return (
    <main className="flex h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Atlas</span>
          <span className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            Email verification
          </span>
        </div>

        {status === "verifying" ? (
          <p className="mt-4 text-[12.5px] text-muted-foreground">Verifying your email…</p>
        ) : null}

        {status === "success" ? (
          <>
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              Your email is verified. You can now run world scans.
            </p>
            <Button className="mt-4 w-full" onClick={() => window.location.assign("/")}>
              Continue to Atlas
            </Button>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <p className="mt-4 text-[12.5px] text-destructive">{message}</p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => window.location.assign("/")}
            >
              Back to Atlas
            </Button>
          </>
        ) : null}
      </Card>
    </main>
  );
}
