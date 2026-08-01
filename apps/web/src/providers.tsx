import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpSavedReportsRepository } from "@/features/intelligence/repositories/http-saved-reports-repository.ts";
import type { SavedReportsRepository } from "@/features/intelligence/repositories/saved-reports-repository.ts";
import { HttpMarketRepository } from "@/features/world-awareness/repositories/http-market-repository.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { makeStore } from "@/store/index.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, createContext, useContext, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";

const SavedReportsRepositoryContext = createContext<SavedReportsRepository | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());
  const [savedReportsRepository] = useState<SavedReportsRepository>(
    () => new HttpSavedReportsRepository(),
  );
  const [store] = useState(() => makeStore({ marketRepository }));

  return (
    <ReduxProvider store={store}>
      <ToastProvider>
        <AuthProvider>
          <SavedReportsRepositoryContext.Provider value={savedReportsRepository}>
            {children}
          </SavedReportsRepositoryContext.Provider>
        </AuthProvider>
      </ToastProvider>
    </ReduxProvider>
  );
}

export function useSavedReportsRepository(): SavedReportsRepository {
  const repository = useContext(SavedReportsRepositoryContext);
  if (!repository) throw new Error("SavedReportsRepositoryContext is not available");
  return repository;
}
