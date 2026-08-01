import { dashboardReducer } from "@/features/world-awareness/infra/store/dashboard.slice.ts";
import { intelligenceReducer } from "@/features/world-awareness/infra/store/intelligence.slice.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { configureStore } from "@reduxjs/toolkit";

export interface AppThunkExtra {
  marketRepository: MarketRepository;
}

export function makeStore(extra: AppThunkExtra) {
  return configureStore({
    reducer: {
      worldAwarenessDashboard: dashboardReducer,
      worldAwarenessIntelligence: intelligenceReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
