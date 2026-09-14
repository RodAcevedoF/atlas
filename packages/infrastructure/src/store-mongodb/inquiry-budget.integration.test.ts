import { expect, test } from "bun:test";
import { RequestInquiryRunUseCase } from "@atlas/application";
import { makeUserId } from "@atlas/domain";
import { MongoClient } from "mongodb";
import { InMemoryInquiryJobQueue } from "../../../application/src/testing/inquiry-job-queue.fake.ts";
import { MongoInquiryRunStore } from "./inquiry-run-store.ts";

const uri = process.env.ATLAS_SECURITY_MONGO_TEST_URI;

test.skipIf(!uri)(
  "Mongo reserves concurrent runs atomically and retains deleted run usage",
  async () => {
    if (!uri || !/^mongodb:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(uri))
      throw new Error("Use a dedicated local Mongo replica set");
    const client = new MongoClient(uri);
    const db = client.db(`atlas_security_test_${crypto.randomUUID().replaceAll("-", "")}`);
    const store = new MongoInquiryRunStore(db);
    const useCase = new RequestInquiryRunUseCase(store, 3, new InMemoryInquiryJobQueue());
    const ownerId = makeUserId("test-owner");
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, (_unused, index) =>
          useCase.execute({
            ownerId,
            role: "user",
            emailVerified: true,
            question: `question ${index}`,
            refresh: false,
          }),
        ),
      );
      const accepted = results.filter((result) => result.status === "fulfilled");

      expect(accepted).toHaveLength(3);
      expect(
        await store.countReservedRunsForOwnerDay(ownerId, new Date().toISOString().slice(0, 10)),
      ).toBe(3);
      const first = accepted[0];
      if (!first || first.status !== "fulfilled") throw new Error("No accepted run");
      await store.deleteInquiryRunById(first.value.runId);
      await expect(
        useCase.execute({
          ownerId,
          role: "user",
          emailVerified: true,
          question: "another",
          refresh: false,
        }),
      ).rejects.toThrow("Inquiry limit reached");
    } finally {
      await db.dropDatabase();
      await client.close();
    }
  },
);

test.skipIf(!uri)(
  "Mongo shares interpretation quotas and concurrency across adapter instances and days",
  async () => {
    if (!uri || !/^mongodb:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(uri))
      throw new Error("Use a dedicated local Mongo replica set");
    const { MongoInquiryAttachmentStore } = await import("../inquiry-attachment-mongodb/index.ts");
    const client = new MongoClient(uri);
    const db = client.db(`atlas_security_test_${crypto.randomUUID().replaceAll("-", "")}`);
    const stores = Array.from({ length: 8 }, () => new MongoInquiryAttachmentStore(db));
    const store = new MongoInquiryAttachmentStore(db);
    try {
      const reservations = await Promise.all(
        stores.map((adapter) => adapter.reserveSharedInterpretation("2026-09-14", 3, 2, 150_000)),
      );

      expect(reservations.filter(Boolean)).toHaveLength(2);
      expect(await store.reserveSharedInterpretation("2026-09-15", 3, 2, 150_000)).toBeNull();
      const lease = reservations.find((reservation) => reservation !== null);
      if (!lease) throw new Error("Expected a lease");
      await store.releaseSharedInterpretation(lease.id);
      expect(await store.reserveSharedInterpretation("2026-09-14", 3, 2, 150_000)).not.toBeNull();
      const second = reservations.find(
        (reservation) => reservation !== null && reservation.id !== lease.id,
      );
      if (!second) throw new Error("Expected another lease");
      await store.releaseSharedInterpretation(second.id);
      expect(await store.reserveSharedInterpretation("2026-09-14", 3, 2, 150_000)).toBeNull();
      expect(await store.reserveSharedInterpretation("2026-09-15", 3, 2, 150_000)).not.toBeNull();
    } finally {
      await db.dropDatabase();
      await client.close();
    }
  },
);

test.skipIf(!uri)("Mongo recovers expired leases and ignores late duplicate releases", async () => {
  if (!uri || !/^mongodb:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(uri))
    throw new Error("Use a dedicated local Mongo replica set");
  const { MongoInquiryAttachmentStore } = await import("../inquiry-attachment-mongodb/index.ts");
  const client = new MongoClient(uri);
  const db = client.db(`atlas_security_test_${crypto.randomUUID().replaceAll("-", "")}`);
  const store = new MongoInquiryAttachmentStore(db);
  try {
    const abandoned = await store.reserveSharedInterpretation("2026-09-14", 2, 1, 150_000);
    if (!abandoned) throw new Error("Expected a lease");
    expect(await store.reserveSharedInterpretation("2026-09-14", 2, 1, 150_000)).toBeNull();
    await db
      .collection<{ _id: string }>("inquiry_shared_interpretation_usage")
      .updateOne({ _id: "shared" }, { $set: { "leases.$[].expiresAt": new Date(0) } });

    const successor = await store.reserveSharedInterpretation("2026-09-14", 2, 1, 150_000);
    if (!successor) throw new Error("Expired capacity was not recovered");
    await store.releaseSharedInterpretation(abandoned.id);
    await store.releaseSharedInterpretation(abandoned.id);

    expect(await store.reserveSharedInterpretation("2026-09-15", 2, 1, 150_000)).toBeNull();
    await store.releaseSharedInterpretation(successor.id);
    expect(await store.reserveSharedInterpretation("2026-09-14", 2, 1, 150_000)).toBeNull();
    expect(await store.reserveSharedInterpretation("2026-09-15", 2, 1, 150_000)).not.toBeNull();
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
