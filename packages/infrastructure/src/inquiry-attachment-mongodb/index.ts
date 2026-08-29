import type { InquiryAttachmentStorePort, SaveInquiryAttachmentInput } from "@atlas/application";
import type {
  AttachmentInterpretation,
  InquiryAttachment,
  InquiryAttachmentId,
  InquiryAttachmentMediaType,
  InquiryRunId,
  TableProfile,
  UserId,
} from "@atlas/domain";
import { makeInquiryAttachmentId, makeInquiryRunId, makeUserId } from "@atlas/domain";
import { type Collection, type Db, GridFSBucket, type GridFSFile, MongoServerError } from "mongodb";

const BUCKET_NAME = "inquiry_attachments";
const FILES_COLLECTION = `${BUCKET_NAME}.files`;

interface InquiryAttachmentMetadata {
  id: string;
  ownerId: string;
  mediaType: InquiryAttachmentMediaType;
  profile: TableProfile | null;
  interpretation: AttachmentInterpretation | null;
  interpretationCount: number;
  runId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

interface AttachmentUsageDocument {
  _id: string;
  count: number;
}

export async function ensureInquiryAttachmentIndexes(db: Db): Promise<void> {
  const files = db.collection(FILES_COLLECTION);
  await Promise.all([
    files.createIndex({ "metadata.id": 1 }, { unique: true }),
    files.createIndex({ "metadata.runId": 1, "metadata.expiresAt": 1 }),
  ]);
}

function metadataFrom(file: GridFSFile): InquiryAttachmentMetadata {
  const metadata = file.metadata as Partial<InquiryAttachmentMetadata> | undefined;
  if (
    !metadata ||
    typeof metadata.id !== "string" ||
    typeof metadata.ownerId !== "string" ||
    typeof metadata.mediaType !== "string" ||
    !("profile" in metadata) ||
    typeof metadata.interpretationCount !== "number" ||
    !(metadata.createdAt instanceof Date)
  ) {
    throw new Error(`Inquiry attachment ${file._id.toString()} has invalid metadata`);
  }
  return metadata as InquiryAttachmentMetadata;
}

function attachmentFrom(file: GridFSFile): InquiryAttachment {
  const metadata = metadataFrom(file);
  return {
    id: makeInquiryAttachmentId(metadata.id),
    ownerId: makeUserId(metadata.ownerId),
    filename: file.filename,
    mediaType: metadata.mediaType,
    profile: metadata.profile,
    interpretation: metadata.interpretation,
    interpretationCount: metadata.interpretationCount,
    runId: metadata.runId === null ? null : makeInquiryRunId(metadata.runId),
    createdAt: metadata.createdAt,
    expiresAt: metadata.expiresAt,
  };
}

export class MongoInquiryAttachmentStore implements InquiryAttachmentStorePort {
  private readonly bucket: GridFSBucket;
  private readonly files;
  private readonly uploadUsage: Collection<AttachmentUsageDocument>;
  private readonly interpretationUsage: Collection<AttachmentUsageDocument>;

  constructor(db: Db) {
    this.bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    this.files = db.collection<GridFSFile>(FILES_COLLECTION);
    this.uploadUsage = db.collection<AttachmentUsageDocument>("inquiry_attachment_upload_usage");
    this.interpretationUsage = db.collection<AttachmentUsageDocument>(
      "inquiry_attachment_interpretation_usage",
    );
  }

  async saveInquiryAttachment(input: SaveInquiryAttachmentInput): Promise<void> {
    const metadata: InquiryAttachmentMetadata = {
      id: input.attachment.id,
      ownerId: input.attachment.ownerId,
      mediaType: input.attachment.mediaType,
      profile: input.attachment.profile,
      interpretation: input.attachment.interpretation,
      interpretationCount: input.attachment.interpretationCount,
      runId: input.attachment.runId,
      createdAt: input.attachment.createdAt,
      expiresAt: input.attachment.expiresAt,
    };
    const upload = this.bucket.openUploadStream(input.attachment.filename, { metadata });
    await new Promise<void>((resolve, reject) => {
      upload.once("error", reject);
      upload.once("finish", resolve);
      upload.end(input.bytes);
    });
  }

  async findInquiryAttachmentById(id: InquiryAttachmentId): Promise<InquiryAttachment | null> {
    const file = await this.bucket.find({ "metadata.id": id }).limit(1).next();
    return file ? attachmentFrom(file) : null;
  }

  async findInquiryAttachmentBytes(id: InquiryAttachmentId): Promise<Uint8Array | null> {
    const file = await this.bucket.find({ "metadata.id": id }).limit(1).next();
    if (!file) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.bucket.openDownloadStream(file._id)) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  reserveInquiryAttachmentUpload(ownerId: UserId, day: string, cap: number): Promise<boolean> {
    return this.reserve(this.uploadUsage, ownerId, day, cap);
  }

  async reserveAttachmentInterpretation(
    ownerId: UserId,
    day: string,
    cap: number,
  ): Promise<boolean> {
    return this.reserve(this.interpretationUsage, ownerId, day, cap);
  }

  private async reserve(
    usage: Collection<AttachmentUsageDocument>,
    ownerId: UserId,
    day: string,
    cap: number,
  ): Promise<boolean> {
    const id = `${ownerId}:${day}`;
    try {
      const result = await usage.updateOne(
        { _id: id, count: { $lt: cap } },
        { $inc: { count: 1 } },
        { upsert: true },
      );
      return result.matchedCount === 1 || result.upsertedCount === 1;
    } catch (cause) {
      if (!(cause instanceof MongoServerError) || cause.code !== 11000) throw cause;
      const result = await usage.updateOne(
        { _id: id, count: { $lt: cap } },
        { $inc: { count: 1 } },
      );
      return result.matchedCount === 1;
    }
  }

  async saveAttachmentInterpretation(
    id: InquiryAttachmentId,
    interpretation: AttachmentInterpretation,
  ): Promise<void> {
    await this.files.updateOne(
      { "metadata.id": id },
      {
        $set: { "metadata.interpretation": interpretation },
        $inc: { "metadata.interpretationCount": 1 },
      },
    );
  }

  async attachInquiryAttachment(id: InquiryAttachmentId, runId: InquiryRunId): Promise<void> {
    await this.files.updateOne(
      { "metadata.id": id },
      { $set: { "metadata.runId": runId, "metadata.expiresAt": null } },
    );
  }

  async deleteInquiryAttachment(id: InquiryAttachmentId): Promise<void> {
    const file = await this.files.findOne({ "metadata.id": id }, { projection: { _id: 1 } });
    if (file) await this.bucket.delete(file._id);
  }

  async deleteInquiryAttachmentsByRunId(runId: InquiryRunId): Promise<void> {
    const files = await this.bucket.find({ "metadata.runId": runId }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }

  async deleteExpiredInquiryAttachments(now: Date): Promise<void> {
    const files = await this.bucket
      .find({ "metadata.runId": null, "metadata.expiresAt": { $lte: now } })
      .toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }
}
