import { afterEach, expect, test } from "bun:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { InMemoryProfileRepository } from "../testing/profile-repository.fake.ts";
import { useProfileImage } from "./use-profile-image.ts";

afterEach(cleanup);

test("page rerenders retain the photo and a new revision replaces it", async () => {
  const repository = new InMemoryProfileRepository();
  repository.image = new Blob(["first image"], { type: "image/png" });
  const { result, rerender } = renderHook(({ revision }) => useProfileImage(repository, revision), {
    initialProps: { revision: "first" },
  });
  await waitFor(() => expect(result.current).toStartWith("blob:"));
  const firstUrl = result.current;

  rerender({ revision: "first" });

  expect(result.current).toBe(firstUrl);

  repository.image = new Blob(["second image"], { type: "image/png" });
  rerender({ revision: "second" });

  await waitFor(() => expect(result.current).toStartWith("blob:"));
  expect(result.current).not.toBe(firstUrl);
});

test("removing a photo clears the URL before another account loads", async () => {
  const repository = new InMemoryProfileRepository();
  repository.image = new Blob(["image"], { type: "image/png" });
  const { result, rerender } = renderHook<string | null, { revision: string | null }>(
    ({ revision }) => useProfileImage(repository, revision),
    { initialProps: { revision: "first" } },
  );
  await waitFor(() => expect(result.current).toStartWith("blob:"));

  repository.image = null;
  rerender({ revision: null });

  expect(result.current).toBeNull();

  rerender({ revision: "another-account" });

  await waitFor(() => expect(result.current).toBeNull());
});
