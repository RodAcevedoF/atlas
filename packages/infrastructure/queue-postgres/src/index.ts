import type { EnqueueOptions, Job, JobHandler, JobQueuePort } from "@atlas/application";
import { NotImplementedError } from "@atlas/shared";

export class PostgresJobQueue implements JobQueuePort {
  async enqueue<T>(_type: string, _payload: T, _options?: EnqueueOptions): Promise<string> {
    throw new NotImplementedError("PostgresJobQueue.enqueue");
  }

  process<T>(_type: string, _handler: JobHandler<T>): void {
    throw new NotImplementedError("PostgresJobQueue.process");
  }

  async cancel(_id: string): Promise<void> {
    throw new NotImplementedError("PostgresJobQueue.cancel");
  }
}
