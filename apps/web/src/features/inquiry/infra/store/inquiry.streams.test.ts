import { expect, test } from "bun:test";
import { makeStore } from "@/store/index.ts";
import { buildInquiryRun, buildInquiryRunSummary } from "../../testing/inquiry-builder.ts";
import {
  inMemoryAskInquiryRepository,
  inMemoryDeleteInquiryRepository,
} from "../../testing/inquiry-repository.fake.ts";
import { inMemoryInquiryStreamRepository } from "../../testing/inquiry-stream-repository.fake.ts";
import {
  type InquiryStreamPolicy,
  makeWatchInquiryRunStream,
} from "../../use-cases/stream-inquiry-run.ts";
import { deleteInquiryRun, loadRecentInquiryRuns } from "./inquiry.commands.ts";
import { attachInquiryRunStreams } from "./inquiry.streams.ts";

const FAST: InquiryStreamPolicy = { reconnectDelaysMs: [1], retryReopenDelaysMs: [1] };

function attachedStore(seed: { runs: ReturnType<typeof buildInquiryRunSummary>[] }) {
  const streams = inMemoryInquiryStreamRepository();
  const store = makeStore({ inquiryRepository: inMemoryAskInquiryRepository(seed) });
  const detach = attachInquiryRunStreams(
    store,
    makeWatchInquiryRunStream({ inquiryStreamRepository: streams.repository }, FAST),
  );
  return { streams, store, detach };
}

test("a listed live run streams its snapshots into the list row and the map detail", async () => {
  const running = buildInquiryRunSummary({
    id: "run-live",
    status: "running",
    placeCount: 0,
    revision: 1,
  });
  const { streams, store, detach } = attachedStore({ runs: [running] });
  await store.dispatch(loadRecentInquiryRuns());
  expect(streams.connections.map((connection) => connection.runId)).toEqual(["run-live"]);

  streams.connections[0]?.emit(
    buildInquiryRun({
      id: "run-live",
      status: "running",
      progress: { stage: "map_ready", revision: 2, updatedAt: "2026-09-06T10:00:00.000Z" },
    }),
  );

  const painted = store.getState().inquiry;
  expect(painted.detail.byId["run-live"]?.places).toHaveLength(1);
  expect(painted.runs[0]?.placeCount).toBe(1);

  streams.connections[0]?.emit(buildInquiryRun({ id: "run-live", status: "succeeded" }));

  expect(store.getState().inquiry.runs[0]?.status).toBe("succeeded");
  expect(streams.connections[0]?.isOpen).toBe(false);
  detach();
});

test("a settled history opens no streams", async () => {
  const finished = buildInquiryRunSummary({ id: "run-done", status: "succeeded" });
  const { streams, store, detach } = attachedStore({ runs: [finished] });

  await store.dispatch(loadRecentInquiryRuns());

  expect(streams.connections).toHaveLength(0);
  detach();
});

test("a retry-pending failure is watched too, so its row updates when the worker retries", async () => {
  const failed = buildInquiryRunSummary({ id: "run-retry", status: "failed_retryable" });
  const { streams, store, detach } = attachedStore({ runs: [failed] });

  await store.dispatch(loadRecentInquiryRuns());

  expect(streams.connections.map((connection) => connection.runId)).toEqual(["run-retry"]);
  detach();
});

test("repeated list loads reuse the single stream a run already has", async () => {
  const running = buildInquiryRunSummary({ id: "run-live", status: "running" });
  const { streams, store, detach } = attachedStore({ runs: [running] });

  await store.dispatch(loadRecentInquiryRuns());
  await store.dispatch(loadRecentInquiryRuns());

  expect(streams.connections).toHaveLength(1);
  detach();
});

test("a run deleted from the list has its stream closed", async () => {
  const running = buildInquiryRunSummary({ id: "run-live", status: "running" });
  const streams = inMemoryInquiryStreamRepository();
  const store = makeStore({
    inquiryRepository: inMemoryDeleteInquiryRepository({ runs: [running] }),
  });
  const detach = attachInquiryRunStreams(
    store,
    makeWatchInquiryRunStream({ inquiryStreamRepository: streams.repository }, FAST),
  );
  await store.dispatch(loadRecentInquiryRuns());
  expect(streams.connections[0]?.isOpen).toBe(true);

  await store.dispatch(deleteInquiryRun("run-live"));

  expect(streams.connections[0]?.isOpen).toBe(false);
  expect(streams.connections).toHaveLength(1);
  detach();
});

test("detaching closes every live stream", async () => {
  const running = buildInquiryRunSummary({ id: "run-live", status: "running" });
  const { streams, store, detach } = attachedStore({ runs: [running] });
  await store.dispatch(loadRecentInquiryRuns());

  detach();

  expect(streams.connections[0]?.isOpen).toBe(false);
});
