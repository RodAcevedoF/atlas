import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  ListWorldSnapshotsInput,
  TopicSnapshotRecord,
  WorldScanHistoryFilter,
  WorldScanHistoryItem,
  WorldScanInput,
  WorldScanReportRecord,
} from "../../repositories/market-repository.ts";
import { makeListWorldScanReports } from "../../use-cases/list-world-scan-reports.ts";
import { makeListWorldSnapshots } from "../../use-cases/list-world-snapshots.ts";
import { makeRunWorldScan } from "../../use-cases/run-world-scan.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadTopicSnapshots = createAsyncThunk<
  TopicSnapshotRecord[],
  ListWorldSnapshotsInput,
  CommandConfig
>("worldAwarenessIntelligence/loadSnapshots", (input, { extra }) =>
  makeListWorldSnapshots(extra)(input),
);

export const runWorldScan = createAsyncThunk<WorldScanReportRecord, WorldScanInput, CommandConfig>(
  "worldAwarenessIntelligence/runScan",
  (input, { extra }) => makeRunWorldScan(extra)(input),
);

export const loadScanHistory = createAsyncThunk<
  WorldScanHistoryItem[],
  WorldScanHistoryFilter,
  CommandConfig
>("worldAwarenessIntelligence/loadHistory", (input, { extra }) =>
  makeListWorldScanReports(extra)(input),
);
