import { cn } from "@atlas/ui";

interface AvatarProps {
  name: string;
  isActive: boolean;
  className?: string;
}

export function Avatar({ name, isActive, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full border",
        "bg-secondary text-[13px] font-semibold uppercase text-primary transition-colors",
        isActive ? "border-primary" : "border-border-strong",
        className,
      )}
    >
      {name.charAt(0)}
    </span>
  );
}
