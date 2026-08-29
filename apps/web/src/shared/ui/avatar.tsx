import { cn } from "@atlas/ui";
import { useState } from "react";

interface AvatarProps {
  name: string;
  isActive: boolean;
  imageUrl?: string | null;
  onImageLoad?: () => void;
  onImageError?: () => void;
  className?: string;
}

function initialsFrom(name: string): string {
  const localPart = name.split("@")[0] ?? name;
  const [firstSegment, secondSegment] = localPart.split(/[._-]+/).filter(Boolean);
  if (firstSegment && secondSegment) return firstSegment.charAt(0) + secondSegment.charAt(0);
  return localPart.slice(0, 2);
}

export function Avatar({
  name,
  isActive,
  imageUrl,
  onImageLoad,
  onImageError,
  className,
}: AvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showImage = imageUrl && imageUrl !== failedImageUrl;

  return (
    <span
      className={cn(
        "flex h-8.5 w-8.5 flex-none items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-primary/30 via-secondary to-secondary",
        "text-[11px] font-semibold uppercase tracking-wide text-primary transition-shadow",
        isActive ? "ring-2 ring-primary/70" : "ring-1 ring-border-strong",
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onLoad={onImageLoad}
          onError={() => {
            setFailedImageUrl(imageUrl);
            onImageError?.();
          }}
        />
      ) : (
        initialsFrom(name)
      )}
    </span>
  );
}
