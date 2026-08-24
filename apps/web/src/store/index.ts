import { inquiryReducer } from "@/features/inquiry/infra/store/inquiry.slice.ts";
import type { InquiryRepository } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { configureStore } from "@reduxjs/toolkit";

export interface AppThunkExtra {
  inquiryRepository: InquiryRepository;
}

export function makeStore(extra: AppThunkExtra) {
  return configureStore({
    reducer: {
      inquiry: inquiryReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: extra } }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
