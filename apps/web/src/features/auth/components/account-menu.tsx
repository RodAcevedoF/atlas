import { Avatar, Eyebrow, PANEL } from "@/shared/ui";
import type { GeoRegion, Topic } from "@atlas/domain";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";
import { Button, Card, cn, useToast } from "@atlas/ui";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
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
  const {
    user,
    profileImageUrl,
    logout,
    updatePreferences,
    uploadProfileImage,
    deleteProfileImage,
  } = useAuth();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [regions, setRegions] = useState<GeoRegion[]>(user?.profile.preferredRegions ?? []);
  const [topics, setTopics] = useState<Topic[]>(user?.profile.preferredTopics ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingImage, setIsChangingImage] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);

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

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    if (!image) return;

    setIsChangingImage(true);
    try {
      await uploadProfileImage(image);
      setHasProfileImage(true);
      toast("Profile image updated.", "success");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update profile image", "error");
    } finally {
      event.target.value = "";
      setIsChangingImage(false);
    }
  };

  const removeImage = async () => {
    setIsChangingImage(true);
    try {
      await deleteProfileImage();
      setHasProfileImage(false);
      toast("Profile image removed.", "success");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not remove profile image", "error");
    } finally {
      setIsChangingImage(false);
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
        <Avatar
          name={user.email}
          isActive={open}
          imageUrl={profileImageUrl}
          onImageLoad={() => setHasProfileImage(true)}
          onImageError={() => setHasProfileImage(false)}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <Card
            className={cn(
              PANEL,
              "absolute right-0 top-12 z-50 flex max-h-[calc(100vh-6rem)] w-80 flex-col gap-4 overflow-y-auto p-5",
            )}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose profile image"
              className="sr-only"
              onChange={(event) => void uploadImage(event)}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Upload profile image"
                disabled={hasProfileImage || isChangingImage}
                onClick={() => imageInputRef.current?.click()}
                className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <Avatar
                  name={user.email}
                  isActive={false}
                  imageUrl={profileImageUrl}
                  onImageLoad={() => setHasProfileImage(true)}
                  onImageError={() => setHasProfileImage(false)}
                  className="h-12 w-12"
                />
                {!hasProfileImage ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0 flex items-center justify-center rounded-full bg-primary/85 text-primary-foreground",
                      "scale-90 opacity-0 transition-[opacity,transform] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100",
                      isChangingImage && "scale-100 opacity-100",
                    )}
                  >
                    {isChangingImage ? (
                      <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </span>
                ) : null}
              </button>
              <div className="min-w-0 flex-1">
                <Eyebrow>Signed in</Eyebrow>
                <span className="mt-1.5 block truncate text-sm font-medium" title={user.email}>
                  {user.email}
                </span>
              </div>
              {hasProfileImage ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove profile image"
                  disabled={isChangingImage}
                  onClick={() => void removeImage()}
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  {isChangingImage ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              ) : null}
            </div>

            {!hasProfileImage ? (
              <span className="text-[11px] text-muted-foreground">
                Click the avatar to upload · JPEG, PNG or WebP · 5 MB max
              </span>
            ) : null}

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
              Saved topics and regions add a{" "}
              <strong className="font-medium text-card-foreground">Use my preferences</strong>{" "}
              button to the ask box. It writes a starting question you can edit before asking.
            </p>

            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={save} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save preferences"}
              </Button>
              <div className="flex items-center justify-between">
                <Button asChild size="sm" variant="ghost">
                  <Link to="/about">About</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => void logout()}>
                  Sign out
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
