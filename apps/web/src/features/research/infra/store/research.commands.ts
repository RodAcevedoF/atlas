import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ResearchRunRecord } from "../../repositories/research-repository.ts";
import { makeLoadRecentResearchRuns } from "../../use-cases/load-recent-research-runs.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadRecentResearchRuns = createAsyncThunk<ResearchRunRecord[], void, CommandConfig>(
  "research/loadRecent",
  (_input, { extra }) => makeLoadRecentResearchRuns(extra)(),
);
