export interface VectorDoc {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export interface VectorStorePort {
  upsert(collection: string, docs: VectorDoc[]): Promise<void>;
  search(
    collection: string,
    vector: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]>;
  delete(collection: string, ids: string[]): Promise<void>;
}
