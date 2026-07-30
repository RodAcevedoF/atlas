import { useCountUp } from "@/shared/editorial/use-count-up.ts";
import { Button } from "@atlas/ui";
import { Link } from "react-router-dom";
import { MASTHEAD, STATS } from "../data/landing-content.ts";

interface MastheadProps {
  enterHref: string;
  isAuthed: boolean;
}

export function Masthead({ enterHref, isAuthed }: MastheadProps) {
  const signalsToday = useCountUp(STATS.signalsToday);

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-end gap-7 border-b-[3px] border-double border-border-strong px-10 pb-3.5 pt-6.5">
      <div className="font-serif text-[clamp(40px,5vw,74px)] leading-[0.86] tracking-[0.01em]">
        Atlas
      </div>

      <div className="hidden flex-col gap-1.25 pb-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-faint sm:flex">
        <span>{MASTHEAD.edition}</span>
        <span>{MASTHEAD.dateLine}</span>
      </div>

      <div className="flex items-center gap-5.5 pb-2 font-mono text-[9px] uppercase tracking-[0.14em]">
        <span className="hidden items-center gap-1.75 text-faint sm:flex">
          <span className="atlas2-blink h-1.25 w-1.25 bg-primary" />
          {signalsToday.toLocaleString()} read today
        </span>
        {!isAuthed && (
          <Link to="/login" className="text-faint transition-colors hover:text-foreground">
            Sign in
          </Link>
        )}
        <Button
          asChild
          className="rounded-none bg-foreground px-3.5 py-2.25 text-[9px] uppercase tracking-[0.14em] text-background hover:bg-primary"
        >
          <Link to={enterHref}>Open snapshot</Link>
        </Button>
      </div>
    </header>
  );
}
