import { useAuth } from "@/features/auth/auth-provider.tsx";
import { Button, Card } from "@atlas/ui";
import { Link } from "react-router-dom";

interface Highlight {
  eyebrow: string;
  title: string;
  body: string;
}

const HIGHLIGHTS: Highlight[] = [
  {
    eyebrow: "News · the lead",
    title: "What the world is talking about",
    body: "Every story normalizes into a Signal, aggregated by topic and region so attention is measurable, not anecdotal.",
  },
  {
    eyebrow: "Markets · the pulse",
    title: "What people expect to happen",
    body: "Prediction markets price the future. We read them as the crowd's real-money conviction, side by side with the news.",
  },
  {
    eyebrow: "Cross-signal · the edge",
    title: "Where attention meets expectation",
    body: "The gap between what's covered and what's priced is where the interesting questions live. Atlas surfaces it.",
  },
];

function HighlightCard({ eyebrow, title, body }: Highlight) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-primary">{eyebrow}</span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">{title}</span>
      <span className="text-[13px] leading-relaxed text-muted-foreground">{body}</span>
    </Card>
  );
}

function LandingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <nav className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Atlas</span>
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          World Awareness
        </span>
      </div>
      {isAuthed ? (
        <Button asChild size="sm">
          <Link to="/app">Open dashboard</Link>
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}

export function LandingPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-8">
        <LandingNav isAuthed={isAuthed} />

        <header className="flex flex-col items-start gap-5 pt-8">
          <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Attention vs. expectation
          </span>
          <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            See what the world is paying attention to — and what it expects to happen.
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Atlas fuses news coverage with prediction-market pricing into a single map of global
            attention, broken down per region and topic. One metric, honestly sourced.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthed ? (
              <Button asChild size="lg">
                <Link to="/app">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link to="/register">Get started</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((highlight) => (
            <HighlightCard key={highlight.eyebrow} {...highlight} />
          ))}
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Atlas — a live map of world awareness.</span>
          {isAuthed ? (
            <Link to="/app" className="transition-colors hover:text-foreground">
              Go to your dashboard →
            </Link>
          ) : (
            <Link to="/register" className="transition-colors hover:text-foreground">
              Create an account →
            </Link>
          )}
        </footer>
      </div>
    </div>
  );
}
