export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  createdAt: Date;
  attempts: number;
}

export interface EnqueueOptions {
  delay?: number;
  maxAttempts?: number;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export interface JobQueuePort {
  enqueue<T>(type: string, payload: T, options?: EnqueueOptions): Promise<string>;
  process<T>(type: string, handler: JobHandler<T>): void;
  cancel(id: string): Promise<void>;
}
