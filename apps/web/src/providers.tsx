import { type PropsWithChildren, createContext, useContext, useState } from "react";
import { HttpMarketRepository } from "./repositories/http-market-repository.ts";
import type { MarketRepository } from "./repositories/market-repository.ts";

const MarketRepositoryContext = createContext<MarketRepository | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [marketRepository] = useState<MarketRepository>(() => new HttpMarketRepository());

  return (
    <MarketRepositoryContext.Provider value={marketRepository}>
      {children}
    </MarketRepositoryContext.Provider>
  );
}

export function useMarketRepository(): MarketRepository {
  const repository = useContext(MarketRepositoryContext);
  if (!repository) throw new Error("MarketRepositoryContext is not available");
  return repository;
}
