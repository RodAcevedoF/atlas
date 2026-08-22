import { inquiryReducer } from "@/features/inquiry/infra/store/inquiry.slice.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { dashboardReducer } from "@/features/world-awareness/infra/store/dashboard.slice.ts";
import type { WorldRepository } from "@/features/world-awareness/repositories/world-repository.ts";
import { configureStore } from "@reduxjs/toolkit";

export interface AppThunkExtra {
  worldRepository: WorldRepository;
  inquiryRepository: InquiryRepository;
}

export function makeStore(extra: AppThunkExtra) {
  return configureStore({
    reducer: {
      worldAwarenessDashboard: dashboardReducer,
      inquiry: inquiryReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
