import { ACTION_CHIP } from "@/shared/ui/surface.ts";
import { Button, cn } from "@atlas/ui";
import {
  ArrowUpRight,
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { useDatasets } from "../hooks/use-datasets.ts";

export function SavedDatasets({
  onUse,
  disabled,
  children,
}: { onUse: (file: File) => void; disabled: boolean; children?: ReactNode }) {
  const state = useDatasets(onUse);
  const input = useRef<HTMLInputElement>(null);
  const panelId = useId();
  return (
    <div className="mx-3 mb-1 mt-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={null}
          size={null}
          className={cn(
            ACTION_CHIP,
            "border-primary/35 bg-primary/10 text-primary hover:border-primary/60 hover:bg-primary/20",
          )}
          disabled={state.busy || disabled}
          onClick={() => void state.toggle()}
          aria-expanded={state.open}
          aria-controls={panelId}
        >
          <Database aria-hidden="true" className="h-3 w-3" />
          Saved datasets
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3 w-3 transition-transform motion-reduce:transition-none",
              state.open && "rotate-180",
            )}
          />
        </Button>
        {children}
      </div>
      {state.open ? (
        <section
          id={panelId}
          aria-label="Dataset library"
          className="mt-3 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-lg"
        >
          <div className="max-h-[min(28rem,55dvh)] overflow-y-auto overscroll-contain">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/[0.045] p-3.5">
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold tracking-tight text-card-foreground">
                  Your data, ready for research
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Save once. Reuse in your next question.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-lg px-3"
                disabled={state.busy || disabled}
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                Save a dataset
              </Button>
            </header>
            <input
              ref={input}
              type="file"
              accept=".csv,.xlsx"
              className="sr-only"
              aria-label="Save a CSV or Excel dataset"
              disabled={state.busy || disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void state.save(file);
              }}
            />
            <div className="space-y-4 p-3.5">
              {state.pending ? (
                <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.045] p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold text-card-foreground">
                        Choose what to save
                      </h3>
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">
                        {state.pending.file.name}
                      </p>
                    </div>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium text-card-foreground">
                      Worksheets to import
                    </span>
                    <div className="relative">
                      <select
                        className="min-h-10 w-full appearance-none rounded-lg border border-primary/25 bg-background py-2 pl-3 pr-8 text-base text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-xs"
                        value={state.worksheet}
                        onChange={(event) => state.setWorksheet(event.target.value)}
                        disabled={state.busy || disabled}
                      >
                        <option value="">All worksheets ({state.pending.sheets.length})</option>
                        {state.pending.sheets.map((sheet) => (
                          <option key={sheet.name} value={sheet.name}>
                            {sheet.name} · {sheet.rowCount} rows · {sheet.columnCount} columns
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      />
                    </div>
                  </label>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Each worksheet becomes its own saved dataset.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 rounded-lg"
                      disabled={state.busy || disabled}
                      onClick={() => void state.confirmImport()}
                    >
                      Import worksheets
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-lg text-muted-foreground"
                      disabled={state.busy}
                      onClick={state.cancelImport}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
              {state.datasets.length === 0 && !state.busy && !state.pending ? (
                <div className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center">
                  <FileSpreadsheet
                    aria-hidden="true"
                    className="mx-auto mb-2.5 h-6 w-6 text-primary/70"
                  />
                  <p className="font-medium text-card-foreground">No saved datasets yet.</p>
                  <p className="mx-auto mt-1.5 max-w-60 text-[11px] leading-relaxed text-muted-foreground">
                    Add a CSV or Excel file to keep your data close to your research.
                  </p>
                </div>
              ) : null}
              {state.datasets.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    <h3>Saved files</h3>
                    <span className="font-mono tabular-nums">{state.datasets.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {state.datasets.map((dataset) => (
                      <li
                        key={dataset.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-background/40 p-2.5 transition-colors hover:border-primary/25"
                      >
                        <div className="flex min-w-0 flex-[1_1_10rem] items-start gap-2.5">
                          <FileSpreadsheet
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary/80"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-xs font-medium leading-relaxed text-card-foreground">
                              {dataset.name}
                            </p>
                            <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                              {dataset.recordCount} rows · {dataset.columns.length} columns
                            </p>
                          </div>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant={null}
                            size="sm"
                            className="h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                            disabled={state.busy || disabled}
                            onClick={() => void state.use(dataset)}
                          >
                            Use
                            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="rounded-lg text-muted-foreground hover:text-primary"
                          >
                            <a
                              href={`/api/datasets/${encodeURIComponent(dataset.id)}/csv`}
                              aria-label={`Download ${dataset.name} as CSV`}
                              title="Download CSV"
                              download
                            >
                              <Download aria-hidden="true" className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant={null}
                            size="icon"
                            className="rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            disabled={state.busy || disabled}
                            onClick={() => void state.remove(dataset.id)}
                            aria-label={`Delete ${dataset.name}`}
                            title="Delete dataset"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {state.busy ? (
                <output className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                  />
                  Working…
                </output>
              ) : null}
            </div>
            <footer className="space-y-2 border-t border-border px-3.5 py-3 text-[10.5px] leading-relaxed text-muted-foreground">
              <p>Research previews the first 20 rows of each dataset.</p>
              <details>
                <summary className="w-fit cursor-pointer rounded-sm font-medium text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Supported files & limits
                </summary>
                <p className="mt-2">
                  CSV or Excel (.xlsx) · 5 MB maximum. Import up to 10 worksheets, 1,000 total rows
                  and 50 columns per worksheet.
                </p>
              </details>
            </footer>
          </div>
        </section>
      ) : null}
      {state.error ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[11px] leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
