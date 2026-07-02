import type { IngestNewsInput, IngestNewsOutput } from "@atlas/application";

export interface INewsService {
  ingestNews(input?: IngestNewsInput): Promise<IngestNewsOutput>;
}
