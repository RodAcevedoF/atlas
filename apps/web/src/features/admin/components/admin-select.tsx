import { cn } from "@atlas/ui";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { ADMIN_FIELD } from "../utils/admin-form.ts";

type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function AdminSelect({ children, className, ...props }: AdminSelectProps) {
  return (
    <span className="relative block w-full">
      <select {...props} className={cn(ADMIN_FIELD, "appearance-none pr-11", className)}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
