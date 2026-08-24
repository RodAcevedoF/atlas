import type { InquiryRepository } from "../repositories/inquiry-repository.ts";

export interface DeleteInquiryRunDeps {
  inquiryRepository: InquiryRepository;
}

export type DeleteInquiryRun = (runId: string) => Promise<void>;

export function makeDeleteInquiryRun({
  inquiryRepository,
}: DeleteInquiryRunDeps): DeleteInquiryRun {
  return (runId) => inquiryRepository.deleteRun(runId);
}
