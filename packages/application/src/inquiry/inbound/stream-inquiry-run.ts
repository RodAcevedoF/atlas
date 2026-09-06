import type { InquiryRunActor, InquiryRunId, PublicInquiryRun } from "@atlas/domain";
import type {
  InquiryRunSubscription,
  InquiryRunSubscriptionsPort,
} from "../outbound/inquiry-run-subscriptions.ts";
import { type InquiryRunReader, readInquiryRunForActor } from "./get-inquiry-run.ts";

export interface InquiryRunStream {
  snapshots: AsyncIterable<PublicInquiryRun>;
  close(): Promise<void>;
}

export interface StreamInquiryRun {
  execute(id: InquiryRunId, actor: InquiryRunActor): Promise<InquiryRunStream | null>;
}

class ChangeSignal {
  private pending = false;
  private waiting: ((open: boolean) => void) | null = null;
  private closed = false;

  push(): void {
    if (this.closed) return;
    const waiting = this.waiting;
    if (!waiting) {
      this.pending = true;
      return;
    }
    this.waiting = null;
    waiting(true);
  }

  close(): void {
    this.closed = true;
    this.waiting?.(false);
    this.waiting = null;
  }

  next(): Promise<boolean> {
    if (this.closed) return Promise.resolve(false);
    if (this.pending) {
      this.pending = false;
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      this.waiting = resolve;
    });
  }
}

export class StreamInquiryRunUseCase implements StreamInquiryRun {
  constructor(
    private readonly store: InquiryRunReader,
    private readonly subscriptions: InquiryRunSubscriptionsPort,
  ) {}

  async execute(id: InquiryRunId, actor: InquiryRunActor): Promise<InquiryRunStream | null> {
    const changed = new ChangeSignal();
    const subscription = await this.subscriptions.subscribe(id, () => changed.push());
    const snapshot = await this.read(id, actor, changed, subscription);
    if (!snapshot) {
      await close(changed, subscription);
      return null;
    }
    return {
      snapshots: this.follow(id, actor, snapshot, changed),
      close: () => close(changed, subscription),
    };
  }

  private async read(
    id: InquiryRunId,
    actor: InquiryRunActor,
    changed: ChangeSignal,
    subscription: InquiryRunSubscription,
  ): Promise<PublicInquiryRun | null> {
    try {
      return await readInquiryRunForActor(this.store, id, actor);
    } catch (error) {
      await close(changed, subscription);
      throw error;
    }
  }

  private async *follow(
    id: InquiryRunId,
    actor: InquiryRunActor,
    first: PublicInquiryRun,
    changed: ChangeSignal,
  ): AsyncGenerator<PublicInquiryRun> {
    yield first;
    if (first.progress.stage === "terminal") return;

    let delivered = first.progress.revision;
    while (await changed.next()) {
      const next = await readInquiryRunForActor(this.store, id, actor);
      if (!next) return;
      if (next.progress.revision <= delivered) continue;
      delivered = next.progress.revision;
      yield next;
      if (next.progress.stage === "terminal") return;
    }
  }
}

async function close(changed: ChangeSignal, subscription: InquiryRunSubscription): Promise<void> {
  changed.close();
  await subscription.close();
}
