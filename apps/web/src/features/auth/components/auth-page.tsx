import { Button, Card } from "@atlas/ui";
import { useState } from "react";
import { useAuth } from "../auth-provider.tsx";

type Mode = "login" | "register";

const INPUT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await (mode === "login" ? login : register)({ email, password });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Atlas</span>
          <span className="text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
            World Awareness
          </span>
        </div>
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {mode === "login" ? "Sign in to continue." : "Create an account to get started."}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          {error ? <p className="text-[12px] text-destructive">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="mt-1">
            {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </Card>
    </main>
  );
}
