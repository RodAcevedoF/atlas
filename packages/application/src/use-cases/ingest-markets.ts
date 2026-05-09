export interface IngestMarketsInput {
  categories?: string[];
  maxMarkets?: number;
}

export interface IngestMarketsOutput {
  upserted: number;
  ticksRecorded: number;
}

export interface IngestMarkets {
  execute(input: IngestMarketsInput): Promise<IngestMarketsOutput>;
}
