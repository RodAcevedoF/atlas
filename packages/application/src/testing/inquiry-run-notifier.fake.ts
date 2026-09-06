import type {
  InquiryRunNotification,
  InquiryRunNotifierPort,
} from "../inquiry/outbound/inquiry-run-notifier.ts";

export interface RecordingInquiryRunNotifier {
  notifier: InquiryRunNotifierPort;
  published(): InquiryRunNotification[];
}

export function recordingNotifier(delivers = true): RecordingInquiryRunNotifier {
  const published: InquiryRunNotification[] = [];
  return {
    notifier: {
      publish(notification) {
        published.push(notification);
        return Promise.resolve(delivers);
      },
    },
    published: () => [...published],
  };
}

export const stubNotifier: InquiryRunNotifierPort = {
  publish: () => Promise.resolve(true),
};
