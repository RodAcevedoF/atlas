import type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  ListWorldEventsUseCase,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  ListWorldTopicsUseCase,
} from "@atlas/application";
import type { IWorldService } from "./service.ts";

export class WorldService implements IWorldService {
  constructor(
    private readonly listWorldTopicsUseCase: ListWorldTopicsUseCase,
    private readonly listWorldEventsUseCase: ListWorldEventsUseCase,
  ) {}

  listWorldTopics(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.listWorldTopicsUseCase.execute(input);
  }

  listWorldEvents(input: ListWorldEventsInput = {}): Promise<ListWorldEventsOutput> {
    return this.listWorldEventsUseCase.execute(input);
  }
}
