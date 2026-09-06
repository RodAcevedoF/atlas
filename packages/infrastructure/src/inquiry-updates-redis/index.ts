import type {
  InquiryRunNotification,
  InquiryRunNotifierPort,
  InquiryRunSubscription,
  InquiryRunSubscriptionsPort,
} from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";
import type { Redis } from "ioredis";
import type { Logger } from "../logger/index.ts";

export function inquiryUpdatesChannel(runId: InquiryRunId): string {
  return `inquiry:v1:updates:${runId}`;
}

export class RedisInquiryRunNotifier implements InquiryRunNotifierPort {
  constructor(
    private readonly redis: Redis,
    private readonly log: Logger,
  ) {}

  async publish(notification: InquiryRunNotification): Promise<boolean> {
    try {
      await this.redis.publish(
        inquiryUpdatesChannel(notification.runId),
        JSON.stringify({ runId: notification.runId, revision: notification.revision }),
      );
      return true;
    } catch (error) {
      this.log.warn(
        { runId: notification.runId, revision: notification.revision, err: error },
        "inquiry update notification failed, leaving it to reconciliation",
      );
      return false;
    }
  }
}

export class RedisInquiryRunSubscriptions implements InquiryRunSubscriptionsPort {
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly subscriber: Redis,
    private readonly log: Logger,
  ) {
    this.subscriber.on("message", (channel: string) => this.notify(channel));
    this.subscriber.on("ready", () => {
      void this.resubscribe();
    });
  }

  async subscribe(runId: InquiryRunId, onChange: () => void): Promise<InquiryRunSubscription> {
    const channel = inquiryUpdatesChannel(runId);
    const listeners = this.listeners.get(channel) ?? new Set<() => void>();
    listeners.add(onChange);
    this.listeners.set(channel, listeners);
    try {
      await this.subscriber.subscribe(channel);
    } catch (error) {
      this.forget(channel, onChange);
      throw error;
    }
    return { close: () => this.release(channel, onChange) };
  }

  private notify(channel: string): void {
    for (const onChange of this.listeners.get(channel) ?? []) onChange();
  }

  private forget(channel: string, onChange: () => void): boolean {
    const listeners = this.listeners.get(channel);
    if (!listeners) return false;
    listeners.delete(onChange);
    if (listeners.size > 0) return false;
    this.listeners.delete(channel);
    return true;
  }

  private async release(channel: string, onChange: () => void): Promise<void> {
    if (!this.forget(channel, onChange)) return;
    await this.subscriber.unsubscribe(channel);
  }

  /** messages sent while the connection was down are gone, so every reconnected run is told to reload */
  private async resubscribe(): Promise<void> {
    const channels = [...this.listeners.keys()];
    if (channels.length === 0) return;
    try {
      await this.subscriber.subscribe(...channels);
    } catch (error) {
      this.log.error(
        { err: error },
        "inquiry update resubscribe failed, waiting for the next ready",
      );
      return;
    }
    this.log.warn({ runs: channels.length }, "inquiry update subscriber reconnected, reloading");
    for (const channel of channels) this.notify(channel);
  }
}
