import type { IngestNewsInput, IngestNewsOutput, IngestNewsUseCase } from "@atlas/application";
import type { INewsService } from "./service.ts";

export class NewsService implements INewsService {
  constructor(private readonly ingestNewsUseCase: IngestNewsUseCase) {}

  ingestNews(input: IngestNewsInput = {}): Promise<IngestNewsOutput> {
    return this.ingestNewsUseCase.execute(input);
  }
}
