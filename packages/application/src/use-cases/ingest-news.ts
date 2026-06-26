export interface IngestNewsInput {
  query?: string;
  limit?: number;
}

export interface IngestNewsOutput {
  upserted: number;
}

export interface IngestNews {
  execute(input?: IngestNewsInput): Promise<IngestNewsOutput>;
}
