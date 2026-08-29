import type {
  AttachmentInterpretationRecord,
  InquiryAttachmentRecord,
  InquiryRepository,
} from "../repositories/inquiry-repository.ts";

export interface InquiryAttachmentDeps {
  inquiryRepository: InquiryRepository;
}

export function makeUploadInquiryAttachment({
  inquiryRepository,
}: InquiryAttachmentDeps): (file: File) => Promise<InquiryAttachmentRecord> {
  return (file) => inquiryRepository.uploadAttachment(file);
}

export function makeInterpretInquiryAttachment({
  inquiryRepository,
}: InquiryAttachmentDeps): (
  id: string,
  question: string,
) => Promise<AttachmentInterpretationRecord> {
  return (id, question) => inquiryRepository.interpretAttachment(id, question);
}

export function makeDeleteInquiryAttachment({
  inquiryRepository,
}: InquiryAttachmentDeps): (id: string) => Promise<void> {
  return (id) => inquiryRepository.deleteAttachment(id);
}
