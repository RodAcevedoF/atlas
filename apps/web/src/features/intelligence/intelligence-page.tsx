import { AccountMenu } from "@/features/auth/components/account-menu.tsx";
import { useWorldScan } from "@/features/world-awareness/hooks/use-world-scan.ts";
import { AppHeader } from "@/shared/app-shell";
import { SegmentedControl } from "@/shared/ui";
import { Button, cn } from "@atlas/ui";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ResearchRunsBoard } from "./components/research-runs-board.tsx";
import { WorldScanBoard } from "./components/world-scan-board.tsx";
import { parseScanScope } from "./scan-scope.ts";

type IntelligenceView = "research" | "scan";

const VIEWS: ReadonlyArray<{ id: IntelligenceView; label: string }> = [
  { id: "research", label: "Research" },
  { id: "scan", label: "World scan" },
];

function toView(value: string | null): IntelligenceView {
  return value === "scan" ? "scan" : "research";
}

export function IntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = toView(searchParams.get("view"));
  const scope = useMemo(() => parseScanScope(searchParams), [searchParams]);
  const { isScanning, runScan } = useWorldScan();

  const selectView = useCallback(
    (next: IntelligenceView) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        params.set("view", next);
        return params;
      });
    },
    [setSearchParams],
  );

  const runScoped = useCallback(() => void runScan(scope), [runScan, scope]);

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current || view !== "scan" || (!scope.topic && !scope.region)) return;
    didAutoRun.current = true;
    void runScan(scope);
  }, [runScan, scope, view]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        subtitle="Intelligence"
        account={<AccountMenu />}
        actions={
          <>
            <SegmentedControl items={VIEWS} activeId={view} onSelect={selectView} />
            {view === "scan" ? (
              <Button
                onClick={runScoped}
                disabled={isScanning}
                className="h-8.5 px-3.75 text-[12.5px] font-semibold"
              >
                {isScanning ? "Scanning…" : "Run scan"}
              </Button>
            ) : null}
          </>
        }
      />

      <main
        className={cn("min-h-0 flex-1", view === "scan" ? "overflow-y-auto" : "overflow-hidden")}
      >
        {view === "scan" ? <WorldScanBoard scope={scope} /> : <ResearchRunsBoard />}
      </main>
    </div>
  );
}
