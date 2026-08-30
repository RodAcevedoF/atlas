import { expect, test } from "bun:test";
import {
  buildAttachmentFollowUpContext,
  resolveAttachmentIntentStage,
} from "./attachment-intent.ts";

const interpretation = {
  summary: "A supplier table",
  facts: ["Two ports are listed"],
  entities: ["Valencia"],
  proposedQuestion: "Where are port delays being reported?",
  needsClarification: false,
  clarificationQuestion: null,
};

test("a refinement gives the next LLM the original request, current proposal, and new direction", () => {
  const context = buildAttachmentFollowUpContext({
    kind: "refinement",
    originalText: "Focus on Spain",
    interpretation,
    userText: "Make it about Valencia and current labor action",
  });

  expect(context).toContain("Original request: Focus on Spain");
  expect(context).toContain("Current proposed question: Where are port delays being reported?");
  expect(context).toContain("User wants this reformulated: Make it about Valencia");
  expect(context.length).toBeLessThanOrEqual(2_000);
});

test("a clarification carries the exact question and answer into the next interpretation", () => {
  const context = buildAttachmentFollowUpContext({
    kind: "clarification",
    originalText: "",
    interpretation: {
      ...interpretation,
      needsClarification: true,
      clarificationQuestion: "Which region should Atlas research?",
    },
    userText: "Southern Europe",
  });

  expect(context).toContain("Atlas asked: Which region should Atlas research?");
  expect(context).toContain("User answered: Southern Europe");
});

test("a third unclear interpretation ends explicitly instead of opening an unbounded loop", () => {
  const stage = resolveAttachmentIntentStage({
    id: "attachment-1",
    status: "ready",
    interpretation: { ...interpretation, needsClarification: true },
    interpretationCount: 3,
    isRefining: false,
  });

  expect(stage).toBe("ended");
});
