import type { InquiryRepository, InquiryRunRecord } from "../repositories/inquiry-repository.ts";

export interface LoadInquiryRunDeps {
  inquiryRepository: InquiryRepository;
}

export type LoadInquiryRun = (runId: string) => Promise<InquiryRunRecord>;

export function makeLoadInquiryRun({ inquiryRepository }: LoadInquiryRunDeps): LoadInquiryRun {
  return (runId) => inquiryRepository.runById(runId);
}
