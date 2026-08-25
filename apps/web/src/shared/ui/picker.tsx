import { Card, cn } from "@atlas/ui";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { eyebrowVariants } from "./eyebrow.tsx";
import {
  HEADER_CONTROL,
  HEADER_CONTROL_DISABLED,
  PANEL,
  PANEL_HEAD,
  headerControlTone,
} from "./surface.ts";

const POPOVER_HEAD_CLASS = cn(eyebrowVariants({ variant: "meta" }), PANEL_HEAD);

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

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, close]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(HEADER_CONTROL, "max-w-60", headerControlTone(open), HEADER_CONTROL_DISABLED)}
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
          <Card
            className={cn(
              PANEL,
              "absolute right-0 top-12 z-50 flex max-h-[calc(100vh-6rem)] w-88 flex-col overflow-hidden",
            )}
          >
            {title ? <div className={POPOVER_HEAD_CLASS}>{title}</div> : null}
            <div className="min-h-0 flex-1 overflow-y-auto">{children(close)}</div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
