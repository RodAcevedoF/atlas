import { savedReportsReducer } from "@/features/intelligence/infra/store/saved-reports.slice.ts";
import type { SavedReportsRepository } from "@/features/intelligence/repositories/saved-reports-repository.ts";
import { researchReducer } from "@/features/research/infra/store/research.slice.ts";
import type { ResearchRepository } from "@/features/research/repositories/research-repository.ts";
import { dashboardReducer } from "@/features/world-awareness/infra/store/dashboard.slice.ts";
import { intelligenceReducer } from "@/features/world-awareness/infra/store/intelligence.slice.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { configureStore } from "@reduxjs/toolkit";

export interface AppThunkExtra {
  marketRepository: MarketRepository;
  savedReportsRepository: SavedReportsRepository;
  researchRepository: ResearchRepository;
}

export function makeStore(extra: AppThunkExtra) {
  return configureStore({
    reducer: {
      worldAwarenessDashboard: dashboardReducer,
      worldAwarenessIntelligence: intelligenceReducer,
      intelligenceSavedReports: savedReportsReducer,
      research: researchReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
