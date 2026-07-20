import type { GeoRegion, Topic } from "@atlas/domain";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";
import { Button, Card, useToast } from "@atlas/ui";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth-provider.tsx";

function formatLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function ChipToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function AccountMenu() {
  const { user, logout, updatePreferences } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<GeoRegion[]>(user?.profile.preferredRegions ?? []);
  const [topics, setTopics] = useState<Topic[]>(user?.profile.preferredTopics ?? []);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const save = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ preferredRegions: regions, preferredTopics: topics });
      toast("Preferences saved.", "success");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save preferences", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50">
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <Card className="absolute bottom-11 right-0 z-50 flex w-72 flex-col gap-3 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Signed in
              </span>
              <span className="truncate text-[13px] font-medium" title={user.email}>
                {user.email}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Preferred topics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((topic) => (
                  <ChipToggle
                    key={topic}
                    label={formatLabel(topic)}
                    active={topics.includes(topic)}
                    onToggle={() => setTopics((current) => toggleValue(current, topic))}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Preferred regions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {GEO_REGIONS.map((region) => (
                  <ChipToggle
                    key={region}
                    label={formatLabel(region)}
                    active={regions.includes(region)}
                    onToggle={() => setRegions((current) => toggleValue(current, region))}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] leading-snug text-muted-foreground">
              Preferences fill in the world scan when you don't pick a topic or region.
            </p>

            <div className="flex items-center justify-between gap-2">
              <Button size="sm" onClick={save} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save preferences"}
              </Button>
              <div className="flex items-center gap-1">
                <Button asChild size="sm" variant="ghost">
                  <Link to="/about">About</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void logout()}>
                  Sign out
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[13px] font-semibold uppercase text-primary-foreground shadow-lg transition-[filter] hover:brightness-[1.07]"
      >
        {user.email.charAt(0)}
      </button>
    </div>
  );
}
