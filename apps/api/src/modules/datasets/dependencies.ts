import {
  type DatasetParserPort,
  type DatasetStorePort,
  DeleteDatasetUseCase,
  GetDatasetUseCase,
  ImportDatasetUseCase,
  ListDatasetsUseCase,
} from "@atlas/application";

export function makeDatasetDependencies(store: DatasetStorePort, parser: DatasetParserPort) {
  return {
    importDataset: new ImportDatasetUseCase(store, parser),
    listDatasets: new ListDatasetsUseCase(store),
    getDataset: new GetDatasetUseCase(store),
    deleteDataset: new DeleteDatasetUseCase(store),
  };
}

export type DatasetDeps = ReturnType<typeof makeDatasetDependencies>;
