import { describe, expect, test } from "bun:test";
import type {
  InquiryPlace,
  InquiryRun,
  InquiryRunActor,
  InquiryRunId,
  UserId,
} from "@atlas/domain";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { ListInquiryRunsUseCase } from "./list-inquiry-runs.ts";

const SEEDED = 130;
const OWNER_ID = makeUserId("user-1");
const OTHER_OWNER_ID = makeUserId("user-2");
const owner: InquiryRunActor = { id: OWNER_ID, role: "user" };
const adminOwner: InquiryRunActor = { id: OWNER_ID, role: "admin" };
const superAdmin: InquiryRunActor = { id: makeUserId("user-super"), role: "super_admin" };

function run(index: number, ownerId: UserId | null = OWNER_ID): InquiryRun {
  return {
    id: makeInquiryRunId(`run-${index}`),
    ownerId,
    question: `question ${index}`,
    questionKey: `question ${index}`,
    day: "2026-08-17",

    window: "1w",
    places: [],
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "succeeded",
    failure: null,
    error: null,
    attempts: 1,
    createdAt: new Date(2026, 7, 17, 0, 0, index),
    startedAt: null,
    completedAt: null,
  };
}

function place(name: string): InquiryPlace {
  return {
    place: name,
    country: "Sudan",
    latitude: 15.5,
    longitude: 32.56,
    claimCount: 1,
    read: null,
    claims: [
      {
        text: `something happened in ${name}`,
        confidence: 0.8,
        sourceUrl: "https://example.test/article",
        sourceTitle: null,
        publishedDate: null,
        sourceImageUrl: null,
      },
    ],
  };
}

function useCaseOverSeeded(pinnedRunId: InquiryRunId | null = null): ListInquiryRunsUseCase {
  const { store } = inMemoryInquiryRunStore(
    Array.from({ length: SEEDED }, (_unused, index) => run(index)),
  );
  return new ListInquiryRunsUseCase(store, pinnedRunId);
}

describe("ListInquiryRunsUseCase", () => {
  const cases = [
    { name: "an unbounded limit cannot pull the whole collection", asked: 100_000, expected: 100 },
    { name: "no limit serves one page", asked: undefined, expected: 20 },
    { name: "a zero limit is a page size, never the whole collection", asked: 0, expected: 20 },
    { name: "a limit under the cap is the caller's to choose", asked: 5, expected: 5 },
  ];

  for (const { name, asked, expected } of cases) {
    test(name, async () => {
      const useCase = useCaseOverSeeded();

      const { runs } = await useCase.execute(superAdmin, { limit: asked });

      expect(runs).toHaveLength(expected);
    });
  }

  test("a listed run carries how many places it would paint, never the claims behind them", async () => {
    const measured = run(0);
    measured.synthesis = "a long synthesis the list has no use for";
    measured.places = [place("Khartoum"), place("El Fasher")];
    const { store } = inMemoryInquiryRunStore([measured]);
    const useCase = new ListInquiryRunsUseCase(store, null);

    const {
      runs: [listed],
    } = await useCase.execute(owner);

    expect(listed).toEqual({
      id: makeInquiryRunId("run-0"),
      ownerId: makeUserId("user-1"),
      question: "question 0",
      day: "2026-08-17",
      window: "1w",
      placeCount: 2,
      status: "succeeded",
      createdAt: measured.createdAt,
      startedAt: null,
      completedAt: null,
    });
  });

  test("the newest run is served first", async () => {
    const useCase = useCaseOverSeeded();

    const { runs } = await useCase.execute(superAdmin, { limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeInquiryRunId("run-129"),
      makeInquiryRunId("run-128"),
      makeInquiryRunId("run-127"),
    ]);
  });
});

describe("run visibility", () => {
  const roleCases: Array<{
    name: string;
    actor: InquiryRunActor;
    expectedIds: InquiryRunId[];
  }> = [
    {
      name: "a user sees only their own runs",
      actor: owner,
      expectedIds: [makeInquiryRunId("run-0")],
    },
    {
      name: "an admin still sees only their own runs",
      actor: adminOwner,
      expectedIds: [makeInquiryRunId("run-0")],
    },
    {
      name: "only a super admin sees every user's and ownerless runs",
      actor: superAdmin,
      expectedIds: [
        makeInquiryRunId("run-2"),
        makeInquiryRunId("run-1"),
        makeInquiryRunId("run-0"),
      ],
    },
  ];

  for (const { name, actor, expectedIds } of roleCases) {
    test(name, async () => {
      const { store } = inMemoryInquiryRunStore([run(0), run(1, OTHER_OWNER_ID), run(2, null)]);
      const useCase = new ListInquiryRunsUseCase(store, null);

      const { runs } = await useCase.execute(actor);

      expect(runs.map((listed) => listed.id)).toEqual(expectedIds);
    });
  }

  test("an inaccessible pinned run does not escape the same ownership rule", async () => {
    const pinned = run(1, OTHER_OWNER_ID);
    const { store } = inMemoryInquiryRunStore([run(0), pinned]);
    const useCase = new ListInquiryRunsUseCase(store, pinned.id);

    const { runs, pinnedRunId } = await useCase.execute(owner, { limit: 1 });

    expect(runs.map((listed) => listed.id)).toEqual([makeInquiryRunId("run-0")]);
    expect(pinnedRunId).toBeNull();
  });
});

describe("the pinned run the map opens on", () => {
  test("is named on the list so the map can prefer it over the newest run", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-129"));

    const { pinnedRunId } = await useCase.execute(superAdmin, { limit: 3 });

    expect(pinnedRunId).toBe(makeInquiryRunId("run-129"));
  });

  test("rides along when it aged out of the page, or the map could never select it", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-0"));

    const { runs, pinnedRunId } = await useCase.execute(superAdmin, { limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeInquiryRunId("run-129"),
      makeInquiryRunId("run-128"),
      makeInquiryRunId("run-127"),
      makeInquiryRunId("run-0"),
    ]);
    expect(pinnedRunId).toBe(makeInquiryRunId("run-0"));
  });

  test("is reported as unpinned when the configured run does not exist", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-gone"));

    const { runs, pinnedRunId } = await useCase.execute(superAdmin, { limit: 3 });

    expect(runs).toHaveLength(3);
    expect(pinnedRunId).toBeNull();
  });

  test("is absent when nothing is pinned", async () => {
    const useCase = useCaseOverSeeded();

    const { pinnedRunId } = await useCase.execute(superAdmin, { limit: 3 });

    expect(pinnedRunId).toBeNull();
  });
});
