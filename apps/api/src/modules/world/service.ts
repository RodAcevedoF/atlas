import type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
} from "@atlas/application";

export interface IWorldService {
  listWorldTopics(input?: ListWorldTopicsInput): Promise<ListWorldTopicsOutput>;
  listWorldEvents(input?: ListWorldEventsInput): Promise<ListWorldEventsOutput>;
}
