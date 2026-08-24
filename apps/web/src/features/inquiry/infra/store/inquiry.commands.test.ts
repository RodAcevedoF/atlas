import { expect, test } from "bun:test";
import { inMemoryWorldRepository } from "@/features/world-awareness/testing/world-repository.fake.ts";
import { makeStore } from "@/store/index.ts";
import { buildInquiryRunSummary } from "../../testing/inquiry-builder.ts";
import { inMemoryAskInquiryRepository } from "../../testing/inquiry-repository.fake.ts";
import { askInquiryQuestion } from "./inquiry.commands.ts";

test("the asked run is in the list before its id is announced — announced first, the map calls it unknown", async () => {
  const asked = buildInquiryRunSummary({ id: "run-asked" });
  const store = makeStore({
    worldRepository: inMemoryWorldRepository(),
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
