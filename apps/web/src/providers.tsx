import { AuthProvider } from "@/features/auth/auth-provider.tsx";
import { HttpMarketRepository } from "@/features/world-awareness/repositories/http-market-repository.ts";
import type { MarketRepository } from "@/features/world-awareness/repositories/market-repository.ts";
import { type PropsWithChildren, createContext, useContext, useState } from "react";

const MarketRepositoryContext = createContext<MarketRepository | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());

  return (
    <AuthProvider>
      <MarketRepositoryContext.Provider value={marketRepository}>
        {children}
      </MarketRepositoryContext.Provider>
    </AuthProvider>
  );
}

export function useMarketRepository(): MarketRepository {
  const repository = useContext(MarketRepositoryContext);
  if (!repository) throw new Error("MarketRepositoryContext is not available");
  return repository;
}
