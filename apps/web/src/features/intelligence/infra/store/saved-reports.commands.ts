import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { makeListSavedReports } from "../../use-cases/list-saved-reports.ts";
import { makeSaveReport } from "../../use-cases/save-report.ts";
import { makeUnsaveReport } from "../../use-cases/unsave-report.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadSavedReports = createAsyncThunk<WorldScanHistoryItem[], void, CommandConfig>(
  "intelligenceSavedReports/load",
  (_input, { extra }) => makeListSavedReports(extra)(),
);

export const toggleSavedReport = createAsyncThunk<void, string, CommandConfig>(
  "intelligenceSavedReports/toggle",
  async (reportId, { extra, getState, dispatch }) => {
    const { reports } = getState().intelligenceSavedReports;
    const alreadySaved = reports.some((item) => item.id === reportId);
    if (alreadySaved) await makeUnsaveReport(extra)(reportId);
    else await makeSaveReport(extra)(reportId);
    await dispatch(loadSavedReports());
  },
);
