export interface EmbeddingPort {
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}
