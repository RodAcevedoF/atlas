interface ZoomControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControl({ onZoomIn, onZoomOut, onReset }: ZoomControlProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-5 flex -translate-x-1/2 overflow-hidden rounded-[11px] border border-border bg-card/60 backdrop-blur-md">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={onZoomOut}
        className="flex h-8.5 w-9 items-center justify-center border-r border-border text-[19px] text-foreground hover:bg-white/6"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={onZoomIn}
        className="flex h-8.5 w-9 items-center justify-center border-r border-border text-[17px] text-foreground hover:bg-white/6"
      >
        +
      </button>
      <button
        type="button"
        onClick={onReset}
        className="flex h-8.5 items-center px-3.25 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:bg-white/6 hover:text-foreground"
      >
        Reset
      </button>
    </div>
  );
}
