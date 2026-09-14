import { Button } from "@atlas/ui";
import { useRef } from "react";
import { useDatasets } from "../hooks/use-datasets.ts";

export function SavedDatasets({
  onUse,
  disabled,
}: { onUse: (file: File) => void; disabled: boolean }) {
  const state = useDatasets(onUse);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="mx-3 mt-2 text-xs">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={state.busy || disabled}
        onClick={() => void state.toggle()}
        aria-expanded={state.open}
      >
        Saved datasets
      </Button>
      {state.open ? (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-background/50 p-3">
          <p className="text-muted-foreground">
            Save a CSV or Excel file to reuse in research. One sheet, up to 1000 rows and 5 MB.
            Research uses a preview of the first 20 rows.
          </p>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state.busy || disabled}
            onClick={() => input.current?.click()}
          >
            Save a dataset
          </Button>
          {state.datasets.length === 0 && !state.busy ? (
            <p className="text-muted-foreground">No saved datasets yet.</p>
          ) : null}
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {state.datasets.map((dataset) => (
              <li
                key={dataset.id}
                className="flex flex-wrap items-center gap-2 border-t border-border pt-2"
              >
                <span className="min-w-0 flex-1 break-words text-card-foreground">
                  {dataset.name} · {dataset.recordCount} rows
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.busy || disabled}
                  onClick={() => void state.use(dataset)}
                >
                  Use
                </Button>
                <a
                  href={`/api/datasets/${encodeURIComponent(dataset.id)}/csv`}
                  className="text-primary underline"
                  download
                >
                  CSV
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={state.busy || disabled}
                  onClick={() => void state.remove(dataset.id)}
                  aria-label={`Delete ${dataset.name}`}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {state.busy ? <output className="text-muted-foreground">Working…</output> : null}
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="mt-2 text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
