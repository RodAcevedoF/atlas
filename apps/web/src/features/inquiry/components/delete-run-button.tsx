import { Button } from "@atlas/ui";
import { useState } from "react";

interface DeleteRunButtonProps {
  onConfirm: () => void;
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-.8 13.1a2 2 0 0 1-2 1.9H7.8a2 2 0 0 1-2-1.9L5 6" />
      <path d="M10 11v5.5M14 11v5.5" />
    </svg>
  );
}

export function DeleteRunButton({ onConfirm }: DeleteRunButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setIsConfirming(true)}
      >
        <TrashIcon />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="destructive" size="sm" className="gap-1.5 px-3" onClick={onConfirm}>
        <TrashIcon />
        Confirm
      </Button>
      <Button variant="ghost" size="sm" className="px-3" onClick={() => setIsConfirming(false)}>
        Keep
      </Button>
    </div>
  );
}
