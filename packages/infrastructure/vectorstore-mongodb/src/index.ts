import type { SearchResult, VectorDoc, VectorStorePort } from "@atlas/application";
import { NotImplementedError } from "@atlas/shared";

export class MongoVectorStore implements VectorStorePort {
  async upsert(_collection: string, _docs: VectorDoc[]): Promise<void> {
    throw new NotImplementedError("MongoVectorStore.upsert");
  }

  async search(
    _collection: string,
    _vector: number[],
    _topK: number,
    _filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    throw new NotImplementedError("MongoVectorStore.search");
  }

  async delete(_collection: string, _ids: string[]): Promise<void> {
    throw new NotImplementedError("MongoVectorStore.delete");
  }
}
