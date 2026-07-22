import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpSavedReportsRepository } from "@/features/intelligence/repositories/http-saved-reports-repository.ts";
import type { SavedReportsRepository } from "@/features/intelligence/repositories/saved-reports-repository.ts";
import { HttpMarketRepository } from "@/features/world-awareness/repositories/http-market-repository.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { ToastProvider } from "@atlas/ui";
import { type PropsWithChildren, createContext, useContext, useState } from "react";

const MarketRepositoryContext = createContext<MarketRepository | null>(null);
const SavedReportsRepositoryContext = createContext<SavedReportsRepository | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());
  const [savedReportsRepository] = useState<SavedReportsRepository>(
    () => new HttpSavedReportsRepository(),
  );

  return (
    <ToastProvider>
      <AuthProvider>
        <MarketRepositoryContext.Provider value={marketRepository}>
          <SavedReportsRepositoryContext.Provider value={savedReportsRepository}>
            {children}
          </SavedReportsRepositoryContext.Provider>
        </MarketRepositoryContext.Provider>
      </AuthProvider>
    </ToastProvider>
  );
}

export function useMarketRepository(): MarketRepository {
  const repository = useContext(MarketRepositoryContext);
  if (!repository) throw new Error("MarketRepositoryContext is not available");
  return repository;
}

export function useSavedReportsRepository(): SavedReportsRepository {
  const repository = useContext(SavedReportsRepositoryContext);
  if (!repository) throw new Error("SavedReportsRepositoryContext is not available");
  return repository;
}
