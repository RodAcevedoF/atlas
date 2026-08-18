import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { ResearchRunRecord } from "../../repositories/research-repository.ts";
import { makeLoadLatestResearchRun } from "../../use-cases/load-latest-research-run.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadLatestResearchRun = createAsyncThunk<
  ResearchRunRecord | null,
  void,
  CommandConfig
>("research/loadLatest", (_input, { extra }) => makeLoadLatestResearchRun(extra)());
