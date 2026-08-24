import { expect, test } from "bun:test";
import { makeStore } from "@/store/index.ts";
import { buildInquiryRunSummary } from "../../testing/inquiry-builder.ts";
import {
  inMemoryAskInquiryRepository,
  inMemoryDeleteInquiryRepository,
} from "../../testing/inquiry-repository.fake.ts";
import { askInquiryQuestion, deleteInquiryRun, loadRecentInquiryRuns } from "./inquiry.commands.ts";

test("the asked run is in the list before its id is announced — announced first, the map calls it unknown", async () => {
  const asked = buildInquiryRunSummary({ id: "run-asked" });
  const store = makeStore({
    inquiryRepository: inMemoryAskInquiryRepository({ runs: [], requested: asked }),
  });
  const listedWhenAnnounced: string[][] = [];
  store.subscribe(() => {
    const { ask, runs } = store.getState().inquiry;
    if (!ask.startedRunId || listedWhenAnnounced.length > 0) return;
    listedWhenAnnounced.push(runs.map((run) => run.id));
  });

  await store.dispatch(askInquiryQuestion({ question: asked.question, refresh: false }));

  expect(listedWhenAnnounced[0]).toEqual(["run-asked"]);
});

test("a deleted run leaves the list, and the selection can fall back to the survivor", async () => {
  const kept = buildInquiryRunSummary({ id: "run-kept" });
  const doomed = buildInquiryRunSummary({ id: "run-doomed" });
  const store = makeStore({
    inquiryRepository: inMemoryDeleteInquiryRepository({ runs: [doomed, kept] }),
  });
  await store.dispatch(loadRecentInquiryRuns());

  await store.dispatch(deleteInquiryRun(doomed.id));

  expect(store.getState().inquiry.runs.map((run) => run.id)).toEqual(["run-kept"]);
});
