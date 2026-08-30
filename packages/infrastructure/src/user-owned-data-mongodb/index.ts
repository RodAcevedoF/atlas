import type { UserOwnedDataPort } from "@atlas/application";
import type { UserId } from "@atlas/domain";
import { type Db, GridFSBucket } from "mongodb";

const INQUIRY_ATTACHMENT_BUCKET = "inquiry_attachments";
const PROFILE_IMAGE_BUCKET = "profile_images";

function escapedRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function deleteGridFsFiles(
  bucket: GridFSBucket,
  filter: Record<string, unknown>,
): Promise<void> {
  const files = await bucket.find(filter).toArray();
  await Promise.all(files.map((file) => bucket.delete(file._id)));
}

export class MongoUserOwnedDataStore implements UserOwnedDataPort {
  private readonly attachments: GridFSBucket;
  private readonly profileImages: GridFSBucket;

  constructor(private readonly db: Db) {
    this.attachments = new GridFSBucket(db, { bucketName: INQUIRY_ATTACHMENT_BUCKET });
    this.profileImages = new GridFSBucket(db, { bucketName: PROFILE_IMAGE_BUCKET });
  }

  async deleteUserOwnedData(userId: UserId): Promise<void> {
    await Promise.all([
      deleteGridFsFiles(this.attachments, { "metadata.ownerId": userId }),
      deleteGridFsFiles(this.profileImages, { filename: userId }),
      this.db.collection("inquiry_runs").deleteMany({ ownerId: userId }),
      this.db
        .collection<{ _id: string }>("inquiry_attachment_upload_usage")
        .deleteMany({ _id: { $regex: `^${escapedRegex(userId)}:` } }),
      this.db
        .collection<{ _id: string }>("inquiry_attachment_interpretation_usage")
        .deleteMany({ _id: { $regex: `^${escapedRegex(userId)}:` } }),
    ]);
  }
}
