import { describe, expect, test } from "bun:test";
import type { InquiryRun, InquiryRunStatus, User, UserRole } from "@atlas/domain";
import { emptyProfile, makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { inMemoryUserStore } from "../../testing/user-store.fake.ts";
import { GetAdminAnalyticsUseCase } from "./get-admin-analytics.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function user(id: string, role: UserRole): User {
  return {
    id: makeUserId(id),
    email: `${id}@atlas.test`,
    emailVerified: true,
    role,
    identities: [],
    profile: emptyProfile(),
    createdAt: new Date(2026, 7, 27, 9, 0, 0),
  };
}

function run(id: string, overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId(id),
    ownerId: makeUserId("user-1"),
    question: `question ${id}`,
    questionKey: `question ${id}`,
    day: today(),
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
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("GetAdminAnalyticsUseCase", () => {
  test("an empty platform reports a zero in every bucket, not missing keys", async () => {
    const { store: users } = inMemoryUserStore([]);
    const { store: inquiries } = inMemoryInquiryRunStore([]);
    const useCase = new GetAdminAnalyticsUseCase(users, inquiries);

    const analytics = await useCase.execute();

    expect(analytics.users).toEqual({
      total: 0,
      byRole: { user: 0, admin: 0, super_admin: 0 },
    });
    expect(analytics.inquiries.total).toBe(0);
    expect(analytics.inquiries.today).toBe(0);
    expect(analytics.inquiries.retrievalCostUsd).toBe(0);
    expect(analytics.inquiries.byStatus).toEqual({
      queued: 0,
      running: 0,
      succeeded: 0,
      no_coverage: 0,
      below_floor: 0,
      failed_retryable: 0,
      failed_permanent: 0,
    });
  });

  test("users are counted by the role they carry", async () => {
    const { store: users } = inMemoryUserStore([
      user("user-a", "user"),
      user("user-b", "user"),
      user("user-admin", "admin"),
      user("user-super", "super_admin"),
    ]);
    const { store: inquiries } = inMemoryInquiryRunStore([]);
    const useCase = new GetAdminAnalyticsUseCase(users, inquiries);

    const analytics = await useCase.execute();

    expect(analytics.users).toEqual({
      total: 4,
      byRole: { user: 2, admin: 1, super_admin: 1 },
    });
  });

  test("today's runs are counted against the UTC day, not against createdAt", async () => {
    const { store: users } = inMemoryUserStore([]);
    const { store: inquiries } = inMemoryInquiryRunStore([
      run("run-today"),
      run("run-yesterday", { day: "2020-01-01" }),
    ]);
    const useCase = new GetAdminAnalyticsUseCase(users, inquiries);

    const analytics = await useCase.execute();

    expect(analytics.inquiries.total).toBe(2);
    expect(analytics.inquiries.today).toBe(1);
  });

  test("retrieval cost is the sum of every run, including ones that spent nothing", async () => {
    const { store: users } = inMemoryUserStore([]);
    const { store: inquiries } = inMemoryInquiryRunStore([
      run("run-a", { costUsd: 0.047 }),
      run("run-b", { costUsd: 0.1 }),
      run("run-c", { costUsd: 0 }),
    ]);
    const useCase = new GetAdminAnalyticsUseCase(users, inquiries);

    const analytics = await useCase.execute();

    expect(analytics.inquiries.retrievalCostUsd).toBeCloseTo(0.147);
  });

  test("runs are counted by status so a failed day is visible as failed, not as volume", async () => {
    const statuses: InquiryRunStatus[] = ["succeeded", "succeeded", "failed_permanent", "queued"];
    const { store: users } = inMemoryUserStore([]);
    const { store: inquiries } = inMemoryInquiryRunStore(
      statuses.map((status, index) => run(`run-${index}`, { status })),
    );
    const useCase = new GetAdminAnalyticsUseCase(users, inquiries);

    const analytics = await useCase.execute();

    expect(analytics.inquiries.byStatus.succeeded).toBe(2);
    expect(analytics.inquiries.byStatus.failed_permanent).toBe(1);
    expect(analytics.inquiries.byStatus.queued).toBe(1);
    expect(analytics.inquiries.byStatus.running).toBe(0);
  });
});
