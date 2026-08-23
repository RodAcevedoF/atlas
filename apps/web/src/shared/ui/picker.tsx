import { Card, cn } from "@atlas/ui";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Eyebrow } from "./eyebrow.tsx";

interface PickerProps {
  /** What the closed trigger reads — usually the current selection. */
  trigger: ReactNode;
  label: string;
  title?: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
}

export function Picker({ trigger, label, title, disabled, children }: PickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (!open || event.key !== "Escape") return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-8.5 max-w-60 items-center gap-2 rounded-[10px] border px-3 text-[12.5px] transition-colors",
          open
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border-strong bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
          "disabled:text-muted-foreground/60 disabled:hover:border-border-strong disabled:hover:bg-secondary disabled:hover:text-muted-foreground/60",
        )}
      >
        <span className="min-w-0 truncate">{trigger}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${label}`}
            className="fixed inset-0 z-40 cursor-default"
            onClick={close}
          />
          <Card className="atlas-popover-shadow absolute right-0 top-11 z-50 flex max-h-[calc(100vh-5rem)] w-80 flex-col gap-2.5 overflow-y-auto border-border-strong p-3.5">
            {title ? <Eyebrow>{title}</Eyebrow> : null}
            {children(close)}
          </Card>
        </>
      ) : null}
    </div>
  );
}
