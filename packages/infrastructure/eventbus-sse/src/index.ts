import type { DomainEvent, EventBusPort, EventHandler } from "@atlas/application";
import { NotImplementedError } from "@atlas/shared";

export class SseEventBus implements EventBusPort {
  async publish<T>(_event: DomainEvent<T>): Promise<void> {
    throw new NotImplementedError("SseEventBus.publish");
  }

  subscribe<T>(_eventType: string, _handler: EventHandler<T>): () => void {
    throw new NotImplementedError("SseEventBus.subscribe");
  }
}
