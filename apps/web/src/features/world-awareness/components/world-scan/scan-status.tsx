import { Card, cn } from "@atlas/ui";

interface ScanStatusProps {
  error: string | null;
  isScanning: boolean;
  hasReport: boolean;
  className?: string;
}

const SCANNING_MESSAGE = "Reading the window — fusing news attention and market movement…";
const EMPTY_MESSAGE = "No scan yet — run one to fill this view.";

interface Status {
  message: string;
  tone: string;
}

function resolveStatus({ error, isScanning, hasReport }: ScanStatusProps): Status | null {
  if (error) return { message: error, tone: "border-destructive/40 text-destructive" };
  if (isScanning) return { message: SCANNING_MESSAGE, tone: "text-muted-foreground" };
  if (hasReport) return null;
  return { message: EMPTY_MESSAGE, tone: "text-muted-foreground" };
}

export function ScanStatus(props: ScanStatusProps) {
  const status = resolveStatus(props);
  if (!status) return null;

  return (
    <Card className={cn("px-5 py-3.5 text-[12.5px]", status.tone, props.className)}>
      {status.message}
    </Card>
  );
}
