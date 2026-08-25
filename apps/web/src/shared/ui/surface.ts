export const PANEL = "atlas4-panel rounded-[22px] border-0 bg-transparent";

export const PANEL_GLASS = "atlas4-panel-glass rounded-[18px] border-0 bg-transparent";

export const PANEL_HEAD =
  "flex items-center justify-between gap-3 border-b border-border-strong px-4.5 py-3.5";

export const HAIRLINE_ROW = "border-b border-border last:border-b-0";

export const HEADER_CONTROL =
  "flex h-8.5 items-center gap-2 rounded-full border px-4 text-[12.5px] transition-colors";

export function headerControlTone(isEngaged: boolean): string {
  return isEngaged
    ? "border-primary/40 bg-primary/10 text-primary"
    : "border-border-strong bg-coverage/[0.07] text-foreground hover:border-foreground/50 hover:bg-coverage/[0.14]";
}

export const HEADER_CONTROL_DISABLED =
  "disabled:border-border-strong disabled:bg-coverage/[0.04] disabled:text-muted-foreground/60 disabled:hover:border-border-strong disabled:hover:bg-coverage/[0.04]";
