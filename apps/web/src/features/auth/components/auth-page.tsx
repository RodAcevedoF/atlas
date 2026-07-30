import { BreatheBars } from "@/shared/editorial/breathe-bars.tsx";
import { useCountUp } from "@/shared/editorial/use-count-up.ts";
import { Button, cn, useToast } from "@atlas/ui";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth-provider.tsx";
import { OAuthButton } from "./oauth-button.tsx";

type Mode = "login" | "register";

const SIGNALS_READ_TODAY = 4128;

const LABEL_CLASS = "font-mono text-[8px] uppercase tracking-[0.22em] text-paper-faint";
const INPUT_CLASS =
  "w-full border-0 border-b border-paper-ink/40 bg-transparent py-2.5 text-[16px] text-paper-ink outline-none transition-colors focus:border-paper-conviction";
const OAUTH_CLASS =
  "h-auto rounded-none border-paper-ink/30 bg-transparent py-3 text-[14px] text-paper-ink hover:bg-paper-ink/[0.06] hover:text-paper-ink";

export function AuthPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signalsToday = useCountUp(SIGNALS_READ_TODAY);
  const isLogin = mode === "login";

  const submit = async () => {
    setIsSubmitting(true);
    try {
      await (isLogin ? login : register)({ email, password });
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Something went wrong", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_430px]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-background p-10 text-foreground lg:flex">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-faint">
          No. 412 — global edition · 28 jul 2026
        </div>
        <div className="max-w-[18ch] font-serif text-[clamp(40px,6vw,92px)] leading-[0.98]">
          The world is read twice — <span className="italic text-primary">once in the odds</span>.
        </div>
        <div>
          <BreatheBars count={56} className="h-24 border-b border-border-strong" />
          <div className="mt-2.25 font-mono text-[8px] uppercase tracking-[0.2em] text-faint">
            {signalsToday.toLocaleString()} signals read today
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center bg-paper px-11 py-10 text-paper-ink">
        <div className="font-serif text-[40px] leading-none">Atlas</div>
        <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.24em] text-paper-faint">
          Coverage × conviction
        </div>
        <p className="mb-8.5 mt-7.5 text-[15.5px] leading-[1.6] text-paper-ink-muted">
          {isLogin
            ? "Sign in to open today's edition."
            : "Create an account to open today's edition."}
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col"
        >
          <label htmlFor="auth-email" className={LABEL_CLASS}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={cn(INPUT_CLASS, "mb-6 mt-2")}
          />

          <label htmlFor="auth-password" className={LABEL_CLASS}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(INPUT_CLASS, "mb-8 mt-2 font-mono text-[15px] tracking-[0.2em]")}
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-auto w-full rounded-none bg-paper-ink py-3.75 text-[9.5px] uppercase tracking-[0.18em] text-paper hover:bg-paper-conviction"
          >
            {isSubmitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-5.5 flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.2em] text-paper-faint">
          <span className="h-px flex-1 bg-paper-ink/20" />
          <span>or</span>
          <span className="h-px flex-1 bg-paper-ink/20" />
        </div>

        <div className="flex flex-col gap-2">
          <OAuthButton provider="github" className={OAUTH_CLASS} />
          <OAuthButton provider="google" className={OAUTH_CLASS} />
        </div>

        <Link
          to={isLogin ? "/register" : "/login"}
          className="mt-7.5 border-t border-paper-ink/20 pt-4 text-[13px] text-paper-faint transition-colors hover:text-paper-ink"
        >
          {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
        </Link>
      </div>
    </main>
  );
}
