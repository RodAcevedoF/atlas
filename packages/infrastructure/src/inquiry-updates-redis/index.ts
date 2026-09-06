import type { InquiryRunNotification, InquiryRunNotifierPort } from "@atlas/application";
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
