interface ZoomControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControl({ onZoomIn, onZoomOut }: ZoomControlProps) {
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
        className="flex h-8.5 w-9 items-center justify-center text-[17px] text-foreground hover:bg-white/6"
      >
        +
      </button>
    </div>
  );
}
