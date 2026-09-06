import { describe, expect, test } from "bun:test";
import { stubNotifier } from "../../testing/inquiry-run-notifier.fake.ts";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  RETRY_AFTER_MS,
  RUN_TIMEOUT_MS,
  SUCCESS_BODY,
  inquiryRun,
} from "../../testing/inquiry-run.builder.ts";
import { answering } from "../../testing/orchestration.fake.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";

describe("a graph payload the run cannot trust", () => {
  test("a status the domain does not know is permanent, not silently accepted", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "kinda_worked" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.failure).toBe("unusable_result");
    expect(stored?.error).toBe("unusable graph status: kinda_worked");
  });

  test("an unfinished status is permanent, so no completed run is left unclaimable", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "running" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("unusable graph status: running");
  });

  test("a malformed place row is permanent, not persisted as an answer", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const body = {
      ...SUCCESS_BODY,
      places: [{ place: "Khartoum", latitude: 15.5, claimCount: 1, claims: [] }],
    };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(body),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
    expect(stored?.places).toEqual([]);
  });

  test("a place counting more claims than it carries is permanent, not a wrong number on screen", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const place = { ...(SUCCESS_BODY.places[0] as Record<string, unknown>), claimCount: 9 };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, places: [place] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
  });

  test("a claim whose nullable fields are not text is permanent, not stored as undefined", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const place = SUCCESS_BODY.places[0] as { claims: Record<string, unknown>[] };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [
          {
            ...place,
            claims: [{ ...place.claims[0], sourceTitle: 7 }, place.claims[1]],
          },
        ],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
  });

  test("a historical graph response without an image field is normalized to null", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const place = SUCCESS_BODY.places[0];
    const claim = place.claims[0];
    const { sourceImageUrl, ...historicalClaim } = claim;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [{ ...place, claims: [historicalClaim, place.claims[1]] }],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(sourceImageUrl).toBe("https://images.example.test/article.jpg");
    expect(stored?.places[0]?.claims[0]?.sourceImageUrl).toBeNull();
  });

  test("a historical graph response without a place read normalizes it to null", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const place = SUCCESS_BODY.places[0];
    const { read, ...historicalPlace } = place;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, places: [historicalPlace] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(read).not.toBeNull();
    expect(stored?.places[0]?.read).toBeNull();
  });

  test("a place read citing another source is dropped without losing the research run", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const place = SUCCESS_BODY.places[0];
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [
          {
            ...place,
            read: { text: place.read.text, sourceUrls: ["https://example.test/not-a-claim"] },
          },
        ],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.synthesis).toBe(SUCCESS_BODY.synthesis);
    expect(stored?.places[0]?.read).toBeNull();
  });

  test("a historical graph response without documents persists an empty collection", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const { documents, ...historicalBody } = SUCCESS_BODY;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(historicalBody),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(documents).toHaveLength(1);
    expect(stored?.documents).toEqual([]);
  });

  test("an unusable source document cannot corrupt the stored extraction inputs", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        documents: [{ ...SUCCESS_BODY.documents[0], highlights: "not a list" }],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph documents");
    expect(stored?.documents).toEqual([]);
  });

  const unsafeImageUrls = [
    "http://images.example.test/article.jpg",
    "https://reader:secret@images.example.test/article.jpg",
    "https://",
    " https://images.example.test/article.jpg ",
  ];

  for (const sourceImageUrl of unsafeImageUrls) {
    test(`an unsafe source image URL is rejected: ${sourceImageUrl}`, async () => {
      const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
      const place = SUCCESS_BODY.places[0];
      const claim = place.claims[0];
      const useCase = new ExecuteInquiryRunUseCase(
        store,
        answering({
          ...SUCCESS_BODY,
          places: [
            {
              ...place,
              claims: [{ ...claim, sourceImageUrl }, place.claims[1]],
            },
          ],
        }),
        RETRY_AFTER_MS,
        RUN_TIMEOUT_MS,
        stubNotifier,
      );

      await useCase.execute();

      const [stored] = runs();
      expect(stored?.status).toBe("failed_permanent");
      expect(stored?.error).toContain("unusable graph places");
    });
  }

  test("a count that is not a count is permanent, not silently zeroed", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, unplacedClaims: "two" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph counts");
    expect(stored?.unplacedClaims).toBe(0);
  });

  test("a body that omits the counts keeps the run, reading them as nothing measured", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const { claimCount, unplacedClaims, costUsd, ...withoutCounts } = SUCCESS_BODY;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(withoutCounts),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      stubNotifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.claimCount).toBe(0);
  });
});
