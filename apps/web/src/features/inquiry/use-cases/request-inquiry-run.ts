import type {
  InquiryRepository,
  InquiryRunRequestRecord,
} from "../repositories/inquiry-repository.ts";

export const INQUIRY_QUESTION_MAX_CHARS = 500;

export interface RequestInquiryRunDeps {
  inquiryRepository: InquiryRepository;
}

export type RequestInquiryRun = (question: string) => Promise<InquiryRunRequestRecord>;

export function makeRequestInquiryRun({
  inquiryRepository,
}: RequestInquiryRunDeps): RequestInquiryRun {
  return (question) => inquiryRepository.requestRun(question);
}
