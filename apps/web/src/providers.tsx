import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpSavedReportsRepository } from "@/features/intelligence/repositories/http-saved-reports-repository.ts";
import type { SavedReportsRepository } from "@/features/intelligence/repositories/saved-reports-repository.ts";
import { HttpResearchRepository } from "@/features/research/repositories/http-research-repository.ts";
import type { ResearchRepository } from "@/features/research/repositories/research-repository.ts";
import { HttpMarketRepository } from "@/features/world-awareness/repositories/http-market-repository.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());
  const [savedReportsRepository] = useState<SavedReportsRepository>(
    () => new HttpSavedReportsRepository(),
  );
  const [researchRepository] = useState<ResearchRepository>(() => new HttpResearchRepository());
  const [store] = useState(() =>
    makeStore({ marketRepository, savedReportsRepository, researchRepository }),
  );

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}
