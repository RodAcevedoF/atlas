import { Eyebrow, eyebrowVariants } from "@/shared/ui";
import { Button, cn, useToast } from "@atlas/ui";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth-provider.tsx";
import { OAuthButton } from "./oauth-button.tsx";

type Mode = "login" | "register";

interface FormCopy {
  title: string;
  step: string;
  sub: string;
  submit: string;
  passwordPlaceholder: string;
  switchPrompt: string;
  switchAction: string;
  switchTo: string;
}

const FORM: Record<Mode, FormCopy> = {
  login: {
    title: "Welcome back",
    step: "Sign in",
    sub: "Pick up where the scan left off — today's snapshots are waiting.",
    submit: "Sign in",
    passwordPlaceholder: "••••••••",
    switchPrompt: "New to Atlas?",
    switchAction: "Create an account",
    switchTo: "/register",
  },
  register: {
    title: "Create your Atlas",
    step: "Sign up",
    sub: "Two minutes to set up. Your first snapshot lands the moment you finish.",
    submit: "Create account",
    passwordPlaceholder: "8+ characters",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
    switchTo: "/login",
  },
};

const INPUT_CLASS =
  "w-full rounded-[10px] border border-border bg-coverage/[0.05] px-3.5 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-conviction focus:bg-conviction/[0.06]";

const DIVIDER_CLASS = cn(
  eyebrowVariants({ variant: "card" }),
  "my-5.5 flex items-center gap-3 text-foreground/30",
);
const OAUTH_CLASS =
  "h-auto justify-center gap-2.5 rounded-[10px] border-border bg-coverage/[0.07] py-3 text-[13.5px] text-foreground hover:border-border-strong hover:bg-coverage/[0.12] hover:text-foreground";

/** Right panel of the auth split-screen: OAuth, email/password, and the login⇄register toggle. */
export function AuthForm({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copy = FORM[mode];
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
    <div className="flex flex-col justify-center p-10 md:p-11">
      <div className="flex items-baseline justify-between">
        <div className="text-[26px] font-semibold tracking-[-0.038em]">{copy.title}</div>
        <div className="font-mono text-[11px] text-foreground/40">{copy.step}</div>
      </div>
      <p className="mb-7.5 mt-2.5 text-[14px] leading-[1.55] text-foreground/55">{copy.sub}</p>

      <div className="flex flex-col gap-2.25">
        <OAuthButton provider="google" variant="outline" className={OAUTH_CLASS} />
        <OAuthButton provider="github" variant="outline" className={OAUTH_CLASS} />
      </div>

      <div className={DIVIDER_CLASS}>
        <span className="h-px flex-1 bg-border" />
        <span>or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        <label htmlFor="auth-email" className="flex flex-col gap-2">
          <Eyebrow variant="meta">Work email</Eyebrow>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@newsroom.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label htmlFor="auth-password" className="flex flex-col gap-2">
          <Eyebrow variant="meta">Password</Eyebrow>
          <input
            id="auth-password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={8}
            placeholder={copy.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(INPUT_CLASS, "font-mono tracking-[0.14em]")}
          />
        </label>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-auto w-full rounded-[10px] bg-foreground py-3.5 text-[14px] font-medium text-primary-foreground hover:bg-conviction"
        >
          {isSubmitting ? "Please wait…" : copy.submit}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-[13px] text-foreground/50">
        <span>{copy.switchPrompt}</span>
        <Link
          to={copy.switchTo}
          className="border-b border-conviction/40 font-medium text-conviction transition-colors hover:text-conviction"
        >
          {copy.switchAction}
        </Link>
      </div>
    </div>
  );
}
