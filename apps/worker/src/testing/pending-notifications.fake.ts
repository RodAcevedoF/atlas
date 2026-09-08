import type { ReconcileInquiryNotifications } from "@atlas/application";

export class PendingNotifications implements ReconcileInquiryNotifications {
  pending = true;

  reconcile() {
    const stranded = this.pending ? 1 : 0;
    this.pending = false;
    return Promise.resolve({ stranded, republished: stranded });
  }
}
