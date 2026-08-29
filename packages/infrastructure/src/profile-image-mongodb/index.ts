import type {
  ProfileImage,
  ProfileImageMediaType,
  ProfileImageStorePort,
} from "@atlas/application";
import { PROFILE_IMAGE_MEDIA_TYPES } from "@atlas/application";
import type { UserId } from "@atlas/domain";
import { type Db, GridFSBucket, type GridFSFile } from "mongodb";

const BUCKET_NAME = "profile_images";

interface ProfileImageMetadata {
  mediaType: ProfileImageMediaType;
}

function mediaTypeFrom(file: GridFSFile): ProfileImageMediaType {
  const mediaType = (file.metadata as Partial<ProfileImageMetadata> | undefined)?.mediaType;
  const known = PROFILE_IMAGE_MEDIA_TYPES.find((candidate) => candidate === mediaType);
  if (!known) throw new Error(`Profile image ${file._id.toString()} has no supported media type`);
  return known;
}

export class MongoProfileImageStore implements ProfileImageStorePort {
  private readonly bucket: GridFSBucket;

  constructor(db: Db) {
    this.bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
  }

  async findProfileImage(userId: UserId): Promise<ProfileImage | null> {
    const file = await this.bucket
      .find({ filename: userId })
      .sort({ uploadDate: -1, _id: -1 })
      .limit(1)
      .next();
    if (!file) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of this.bucket.openDownloadStream(file._id)) {
      chunks.push(chunk);
    }

    return {
      mediaType: mediaTypeFrom(file),
      bytes: Buffer.concat(chunks),
    };
  }

  async replaceProfileImage(userId: UserId, image: ProfileImage): Promise<void> {
    const upload = this.bucket.openUploadStream(userId, {
      metadata: { mediaType: image.mediaType } satisfies ProfileImageMetadata,
    });

    await new Promise<void>((resolve, reject) => {
      upload.once("error", reject);
      upload.once("finish", resolve);
      upload.end(image.bytes);
    });

    await this.deleteAllButLatest(userId);
  }

  async deleteProfileImage(userId: UserId): Promise<void> {
    const files = await this.bucket.find({ filename: userId }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }

  private async deleteAllButLatest(userId: UserId): Promise<void> {
    const files = await this.bucket
      .find({ filename: userId })
      .sort({ uploadDate: -1, _id: -1 })
      .toArray();
    await Promise.all(files.slice(1).map((file) => this.bucket.delete(file._id)));
  }
}
