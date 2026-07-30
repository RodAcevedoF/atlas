import { Button } from "@atlas/ui";
import { Link } from "react-router-dom";

export function ClosingFooter({ enterHref }: { enterHref: string }) {
  return (
    <footer className="grid items-end gap-10 px-10 pb-15 pt-14 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="max-w-[22ch] font-serif text-[clamp(30px,4.4vw,62px)] leading-[1.02]">
          Read the world the way it actually is.
        </div>
        <Button
          asChild
          className="mt-6.5 rounded-none bg-foreground px-6 py-3.5 text-[9px] uppercase tracking-[0.16em] text-background hover:bg-primary"
        >
          <Link to={enterHref}>Request access</Link>
        </Button>
      </div>
      <div className="font-mono text-[8px] uppercase leading-loose tracking-[0.2em] text-faint sm:text-right">
        <div>Atlas — coverage × conviction</div>
        <div>news · prediction markets · language models</div>
        <div>No. 412 — set in Bodoni &amp; Martian</div>
      </div>
    </footer>
  );
}
