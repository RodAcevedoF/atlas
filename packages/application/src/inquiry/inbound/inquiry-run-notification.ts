import type {
  InquiryRunNotification,
  InquiryRunNotifierPort,
} from "../outbound/inquiry-run-notifier.ts";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

type NotificationCursor = Pick<InquiryRunStorePort, "confirmInquiryRunNotification">;

async function recorded(
  cursor: NotificationCursor,
  notification: InquiryRunNotification,
): Promise<boolean> {
  try {
    await cursor.confirmInquiryRunNotification(notification);
    return true;
  } catch {
    return false;
  }
}

/** neither half of an announcement may fail a durable run, so what the cursor never recorded stays visible to reconciliation */
export async function notifyInquiryRun(
  notifier: InquiryRunNotifierPort,
  cursor: NotificationCursor,
  notification: InquiryRunNotification,
): Promise<boolean> {
  const delivered = await notifier.publish(notification);
  return delivered && (await recorded(cursor, notification));
}

export interface InquiryNotificationReconciliation {
  stranded: number;
  republished: number;
}

export interface ReconcileInquiryNotifications {
  reconcile(): Promise<InquiryNotificationReconciliation>;
}

export class ReconcileInquiryNotificationsUseCase implements ReconcileInquiryNotifications {
  constructor(
    private readonly store: InquiryRunStorePort,
    private readonly notifier: InquiryRunNotifierPort,
    private readonly batchSize: number,
    private readonly windowMs: number,
  ) {}

  async reconcile(): Promise<InquiryNotificationReconciliation> {
    const stranded = await this.store.findUnnotifiedInquiryRuns({
      limit: this.batchSize,
      updatedAfter: new Date(Date.now() - this.windowMs),
    });
    const delivered = await Promise.all(
      stranded.map((notification) => notifyInquiryRun(this.notifier, this.store, notification)),
    );
    return { stranded: stranded.length, republished: delivered.filter(Boolean).length };
  }
}
