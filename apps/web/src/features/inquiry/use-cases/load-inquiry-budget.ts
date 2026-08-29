import type { InquiryBudgetRecord, InquiryRepository } from "../repositories/inquiry-repository.ts";

export interface LoadInquiryBudgetDeps {
  inquiryRepository: InquiryRepository;
}

export type LoadInquiryBudget = () => Promise<InquiryBudgetRecord>;

export function makeLoadInquiryBudget({
  inquiryRepository,
}: LoadInquiryBudgetDeps): LoadInquiryBudget {
  return () => inquiryRepository.budget();
}
