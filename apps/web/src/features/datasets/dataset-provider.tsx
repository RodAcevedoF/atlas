import { type PropsWithChildren, createContext, useContext } from "react";
import type { DatasetRepository } from "./repositories/dataset-repository.ts";

const DatasetContext = createContext<DatasetRepository | null>(null);

export function DatasetProvider({
  repository,
  children,
}: PropsWithChildren<{ repository: DatasetRepository }>) {
  return <DatasetContext.Provider value={repository}>{children}</DatasetContext.Provider>;
}

export function useDatasetRepository(): DatasetRepository {
  const repository = useContext(DatasetContext);
  if (!repository) throw new Error("DatasetProvider is missing");
  return repository;
}
