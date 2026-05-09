export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface EventBusPort {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): () => void;
}
