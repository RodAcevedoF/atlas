import { describe, expect, test } from "bun:test";
import type { InquiryAttachment, InquiryRun, UserId } from "@atlas/domain";
import { makeInquiryAttachmentId, makeInquiryRunId, makeUserId } from "@atlas/domain";
import { InMemoryInquiryAttachmentStore } from "../../testing/inquiry-attachment-store.fake.ts";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import type { DeleteInquiryRunOutcome, InquiryActor } from "./delete-inquiry-run.ts";
import { DeleteInquiryRunUseCase } from "./delete-inquiry-run.ts";

const HELD_ID = makeInquiryRunId("run-held");
const PINNED_ID = makeInquiryRunId("run-pinned");

const OWNER_ID = makeUserId("user-owner");

const owner: InquiryActor = { id: OWNER_ID, role: "user" };
const stranger: InquiryActor = { id: makeUserId("user-stranger"), role: "user" };
const admin: InquiryActor = { id: makeUserId("user-admin"), role: "admin" };
const superAdmin: InquiryActor = { id: makeUserId("user-super"), role: "super_admin" };

function heldRun(id: InquiryRun["id"], ownerId: UserId | null = OWNER_ID): InquiryRun {
  return {
    id,
    ownerId,
    question: "where are wildfires burning right now",
    questionKey: "where are wildfires burning right now",
    day: "2026-08-25",
    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date(2026, 7, 25, 9, 0, 0),
    startedAt: new Date(2026, 7, 25, 9, 0, 1),
    completedAt: new Date(2026, 7, 25, 9, 0, 30),
  };
}

describe("who may delete a run", () => {
  const cases: { name: string; actor: InquiryActor; outcome: DeleteInquiryRunOutcome }[] = [
    {
      name: "the owner deletes their own inquiry, which is the whole point of the control",
      actor: owner,
      outcome: "deleted",
    },
    {
      name: "a stranger cannot delete an inquiry they did not ask for",
      actor: stranger,
      outcome: "forbidden",
    },
    {
      name: "an admin is not privileged over someone else's inquiry — only a super admin is",
      actor: admin,
      outcome: "forbidden",
    },
    {
      name: "a super admin can clear any inquiry",
      actor: superAdmin,
      outcome: "deleted",
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, async () => {
      const { store, runs } = inMemoryInquiryRunStore([heldRun(HELD_ID)]);
      const useCase = new DeleteInquiryRunUseCase(store, null);

      const outcome = await useCase.execute(HELD_ID, testCase.actor);

      expect(outcome).toBe(testCase.outcome);
      expect(runs().length).toBe(testCase.outcome === "deleted" ? 0 : 1);
    });
  }
});

describe("a run with no owner predates ownership", () => {
  test("no ordinary user inherits it, so it cannot be deleted by whoever finds it", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(HELD_ID, null)]);
    const useCase = new DeleteInquiryRunUseCase(store, null);

    const outcome = await useCase.execute(HELD_ID, stranger);

    expect(outcome).toBe("forbidden");
    expect(runs().length).toBe(1);
  });

  test("a super admin can still clear it, so the old runs are not stranded forever", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(HELD_ID, null)]);
    const useCase = new DeleteInquiryRunUseCase(store, null);

    const outcome = await useCase.execute(HELD_ID, superAdmin);

    expect(outcome).toBe("deleted");
    expect(runs()).toEqual([]);
  });
});

describe("DeleteInquiryRunUseCase", () => {
  test("deleting a run deletes the attachment artifacts linked to it", async () => {
    const { store } = inMemoryInquiryRunStore([heldRun(HELD_ID)]);
    const linked: InquiryAttachment = {
      id: makeInquiryAttachmentId("attachment-1"),
      ownerId: OWNER_ID,
      filename: "companies.csv",
      mediaType: "text/csv",
      profile: { sheetCount: 1, sheets: [], sheetsTruncated: false },
      interpretation: null,
      interpretationCount: 1,
      runId: HELD_ID,
      createdAt: new Date(),
      expiresAt: null,
    };
    const attachments = new InMemoryInquiryAttachmentStore([linked]);
    const useCase = new DeleteInquiryRunUseCase(store, null, attachments);

    const outcome = await useCase.execute(HELD_ID, owner);

    expect(outcome).toBe("deleted");
    expect(await attachments.findInquiryAttachmentById(linked.id)).toBeNull();
  });

  test("an unknown run is not found", async () => {
    const { store } = inMemoryInquiryRunStore([]);
    const useCase = new DeleteInquiryRunUseCase(store, null);

    const outcome = await useCase.execute(HELD_ID, owner);

    expect(outcome).toBe("not_found");
  });

  test("the pinned run is refused and survives — it is the map's fallback backdrop", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(PINNED_ID)]);
    const useCase = new DeleteInquiryRunUseCase(store, PINNED_ID);

    const outcome = await useCase.execute(PINNED_ID, owner);

    expect(outcome).toBe("pinned");
    expect(runs().map((run) => run.id)).toEqual([PINNED_ID]);
  });

  test("even a super admin cannot delete the pinned run — the map would lose its backdrop", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(PINNED_ID)]);
    const useCase = new DeleteInquiryRunUseCase(store, PINNED_ID);

    const outcome = await useCase.execute(PINNED_ID, superAdmin);

    expect(outcome).toBe("pinned");
    expect(runs().map((run) => run.id)).toEqual([PINNED_ID]);
  });
});
