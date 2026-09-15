import type { UserId } from "@atlas/domain";
import { INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES } from "@atlas/domain";
import { InvalidTableError } from "../../inquiry/outbound/tabular-parser.ts";
import { DATASET_MAX_BYTES } from "../limits.ts";

export interface ImportDatasetInput {
  ownerId: UserId;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
  worksheet?: string;
}

export function parseDatasetInput(input: ImportDatasetInput) {
  const mediaType = INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES.find(
    (candidate) => candidate === input.mediaType,
  );
  if (!mediaType) throw new InvalidTableError("Choose a CSV or XLSX file");
  const name = input.filename.trim();
  const extension = mediaType === "text/csv" ? ".csv" : ".xlsx";
  if (
    !name.toLowerCase().endsWith(extension) ||
    name.length > 180 ||
    Array.from(name).some(
      (character) => character.charCodeAt(0) < 32 || character === "/" || character === "\\",
    )
  ) {
    throw new InvalidTableError(
      "Filename must match the file format and be at most 180 characters",
    );
  }
  if (input.bytes.length > DATASET_MAX_BYTES) {
    throw new InvalidTableError("Dataset must be at most 5 MB");
  }
  return { filename: name, mediaType, bytes: input.bytes };
}
