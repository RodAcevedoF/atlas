import type {
  InquiryRepository,
  InquiryRunRequestInput,
  InquiryRunRequestRecord,
} from "../repositories/inquiry-repository.ts";

export const INQUIRY_QUESTION_MAX_CHARS = 500;

export interface RequestInquiryRunDeps {
  inquiryRepository: InquiryRepository;
}

export type RequestInquiryRun = (
  request: InquiryRunRequestInput,
) => Promise<InquiryRunRequestRecord>;

export function makeRequestInquiryRun({
  inquiryRepository,
}: RequestInquiryRunDeps): RequestInquiryRun {
  return (request) => inquiryRepository.requestRun(request);
}
