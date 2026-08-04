import { Avatar, Eyebrow } from "@/shared/ui";
import type { GeoRegion, Topic } from "@atlas/domain";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";
import { Button, Card, cn, useToast } from "@atlas/ui";
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
      className={cn(
        "rounded-lg border px-2.75 py-1.5 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border-strong bg-secondary text-muted-foreground hover:text-foreground",
      )}
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
    <div className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex rounded-full transition-[filter] hover:brightness-110"
      >
        <Avatar name={user.email} isActive={open} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <Card className="atlas-popover-shadow absolute right-0 top-11 z-50 flex max-h-[calc(100vh-5rem)] w-74 flex-col gap-4 overflow-y-auto border-border-strong p-4.5">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>Signed in</Eyebrow>
              <span className="truncate text-sm font-medium" title={user.email}>
                {user.email}
              </span>
            </div>

            <div className="flex flex-col gap-2.25">
              <Eyebrow>Preferred topics</Eyebrow>
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

            <div className="flex flex-col gap-2.25">
              <Eyebrow>Preferred regions</Eyebrow>
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

            <p className="text-xs leading-normal text-muted-foreground">
              Preferences fill in the world scan when you don't pick a topic or region.
            </p>

            <div className="flex items-center gap-3.5">
              <Button size="sm" className="flex-1" onClick={save} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save preferences"}
              </Button>
              <Button asChild size="sm" variant="ghost" className="px-0">
                <Link to="/about">About</Link>
              </Button>
              <Button size="sm" variant="ghost" className="px-0" onClick={() => void logout()}>
                Sign out
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
