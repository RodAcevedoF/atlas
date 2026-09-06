import type { InquiryRunActor, InquiryRunId, PublicInquiryRun } from "@atlas/domain";
import { mayActOnInquiryRun, toPublicInquiryRun } from "@atlas/domain";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";

export type InquiryRunReader = Pick<InquiryRunStorePort, "findInquiryRunById">;

export async function readInquiryRunForActor(
  store: InquiryRunReader,
  id: InquiryRunId,
  actor: InquiryRunActor,
): Promise<PublicInquiryRun | null> {
  const run = await store.findInquiryRunById(id);
  return run && mayActOnInquiryRun(run, actor) ? toPublicInquiryRun(run) : null;
}

export interface GetInquiryRun {
  execute(id: InquiryRunId, actor: InquiryRunActor): Promise<PublicInquiryRun | null>;
}

export class GetInquiryRunUseCase implements GetInquiryRun {
  constructor(private readonly store: InquiryRunStorePort) {}

  async execute(id: InquiryRunId, actor: InquiryRunActor): Promise<PublicInquiryRun | null> {
    return readInquiryRunForActor(this.store, id, actor);
  }
}
