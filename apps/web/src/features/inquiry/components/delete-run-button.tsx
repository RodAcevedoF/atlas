import { CTA_DANGER, CTA_QUIET } from "@/shared/ui";
import { Button } from "@atlas/ui";
import { Check, Trash2 } from "lucide-react";
import { useState } from "react";

const ICON_CLASS = "h-3.5 w-3.5";

interface DeleteRunButtonProps {
  onConfirm: () => void;
}

export function DeleteRunButton({ onConfirm }: DeleteRunButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        variant={null}
        size="pillSm"
        className={CTA_QUIET}
        onClick={() => setIsConfirming(true)}
      >
        <Trash2 className={ICON_CLASS} aria-hidden="true" />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={null} size="pillSm" className={CTA_DANGER} onClick={onConfirm}>
        <Check className={ICON_CLASS} aria-hidden="true" />
        Confirm
      </Button>
      <Button
        variant={null}
        size="pillSm"
        className={CTA_QUIET}
        onClick={() => setIsConfirming(false)}
      >
        Keep
      </Button>
    </div>
  );
}
