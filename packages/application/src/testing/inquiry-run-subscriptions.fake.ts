import type { InquiryRunId } from "@atlas/domain";
import type { InquiryRunSubscriptionsPort } from "../inquiry/outbound/inquiry-run-subscriptions.ts";

export interface FakeInquiryRunSubscriptions {
  subscriptions: InquiryRunSubscriptionsPort;
  announce(runId: InquiryRunId): void;
  openCount(): number;
}

export function fakeSubscriptions(): FakeInquiryRunSubscriptions {
  const receivers = new Map<InquiryRunId, Set<() => void>>();
  return {
    subscriptions: {
      subscribe(runId, onChange) {
        const forRun = receivers.get(runId) ?? new Set<() => void>();
        forRun.add(onChange);
        receivers.set(runId, forRun);
        return Promise.resolve({
          close: () => {
            forRun.delete(onChange);
            return Promise.resolve();
          },
        });
      },
    },
    announce(runId) {
      for (const onChange of receivers.get(runId) ?? []) onChange();
    },
    openCount: () => [...receivers.values()].reduce((open, forRun) => open + forRun.size, 0),
  };
}
