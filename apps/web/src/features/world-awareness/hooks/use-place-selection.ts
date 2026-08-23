import type { InquiryPlaceRecord, InquiryRunRecord } from "@/features/inquiry";
import { useCallback, useMemo, useState } from "react";
import {
  type PlaceIdentity,
  type PlaceSelection,
  findSelectedPlace,
} from "../components/world-map/utils/place-selection.ts";

export interface PlaceSelectionState {
  selected: InquiryPlaceRecord | null;
  select: (identity: PlaceIdentity | null) => void;
  clear: () => void;
}

export function usePlaceSelection(run: InquiryRunRecord | null): PlaceSelectionState {
  const [selection, setSelection] = useState<PlaceSelection | null>(null);
  const runId = run?.id ?? null;

  const select = useCallback(
    (identity: PlaceIdentity | null) => {
      setSelection(identity && runId ? { runId, ...identity } : null);
    },
    [runId],
  );

  const clear = useCallback(() => setSelection(null), []);
  const selected = useMemo(() => findSelectedPlace(run, selection), [run, selection]);

  return { selected, select, clear };
}
