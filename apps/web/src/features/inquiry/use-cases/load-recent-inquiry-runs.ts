import type {
  InquiryRepository,
  InquiryRunListRecord,
} from "../repositories/inquiry-repository.ts";

const RECENT_RUN_LIMIT = 25;

export interface LoadRecentInquiryRunsDeps {
  inquiryRepository: InquiryRepository;
}

export type LoadRecentInquiryRuns = () => Promise<InquiryRunListRecord>;

export function makeLoadRecentInquiryRuns({
  inquiryRepository,
}: LoadRecentInquiryRunsDeps): LoadRecentInquiryRuns {
  return () => inquiryRepository.recentRuns(RECENT_RUN_LIMIT);
}
