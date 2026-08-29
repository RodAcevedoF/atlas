import { describe, expect, test } from "bun:test";
import { makeUserId } from "@atlas/domain";
import { inMemoryProfileImageStore } from "../../testing/profile-image-store.fake.ts";
import {
  DeleteProfileImageUseCase,
  GetProfileImageUseCase,
  InvalidProfileImageError,
  PROFILE_IMAGE_MAX_BYTES,
  ProfileImageTooLargeError,
  UploadProfileImageUseCase,
} from "./profile-image.ts";

const USER_ID = makeUserId("user-profile-image");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 1]);

describe("a user's one profile image", () => {
  test("a new upload replaces the previous image", async () => {
    const store = inMemoryProfileImageStore();
    const upload = new UploadProfileImageUseCase(store);
    const get = new GetProfileImageUseCase(store);
    await upload.execute(USER_ID, { mediaType: "image/png", bytes: PNG });

    await upload.execute(USER_ID, { mediaType: "image/jpeg", bytes: JPEG });

    expect(await get.execute(USER_ID)).toEqual({ mediaType: "image/jpeg", bytes: JPEG });
  });

  test("removing it leaves no image, so the client can return to its fallback avatar", async () => {
    const store = inMemoryProfileImageStore();
    const upload = new UploadProfileImageUseCase(store);
    const get = new GetProfileImageUseCase(store);
    const remove = new DeleteProfileImageUseCase(store);
    await upload.execute(USER_ID, { mediaType: "image/png", bytes: PNG });

    await remove.execute(USER_ID);

    expect(await get.execute(USER_ID)).toBeNull();
  });
});

describe("profile image input", () => {
  const invalidCases = [
    {
      name: "a non-image content type is refused",
      mediaType: "text/plain",
      bytes: PNG,
    },
    {
      name: "a claimed image whose bytes are not that format is refused",
      mediaType: "image/png",
      bytes: JPEG,
    },
  ];

  for (const testCase of invalidCases) {
    test(testCase.name, async () => {
      const upload = new UploadProfileImageUseCase(inMemoryProfileImageStore());

      const result = upload.execute(USER_ID, {
        mediaType: testCase.mediaType,
        bytes: testCase.bytes,
      });

      await expect(result).rejects.toBeInstanceOf(InvalidProfileImageError);
    });
  }

  test("an image above the upload limit is refused before storage", async () => {
    const upload = new UploadProfileImageUseCase(inMemoryProfileImageStore());

    const result = upload.execute(USER_ID, {
      mediaType: "image/png",
      bytes: new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1),
    });

    await expect(result).rejects.toBeInstanceOf(ProfileImageTooLargeError);
  });
});
