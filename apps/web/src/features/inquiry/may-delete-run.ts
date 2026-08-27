import type { InquiryRunActor } from "@atlas/domain";
import { mayActOnInquiryRun } from "@atlas/domain";

interface OwnedRun {
  id: string;
  ownerId: string | null;
}

interface MayDeleteRunInput {
  run: OwnedRun | null;
  deleter: InquiryRunActor | null;
  pinnedRunId: string | null;
}

export function mayDeleteRun({ run, deleter, pinnedRunId }: MayDeleteRunInput): boolean {
  if (!run || !deleter) return false;
  if (run.id === pinnedRunId) return false;
  return mayActOnInquiryRun(run, deleter);
}
