import type { InquiryTabularAttachmentMediaType, TableProfile } from "@atlas/domain";

export interface ParseTableInput {
  filename: string;
  mediaType: InquiryTabularAttachmentMediaType;
  bytes: Uint8Array;
}

export class InvalidTableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTableError";
  }
}

export interface TabularParserPort {
  parse(input: ParseTableInput): Promise<TableProfile>;
}
