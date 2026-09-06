import type {
  GraphRunInput,
  GraphStreamInput,
  OrchestrationPort,
} from "../world/outbound/orchestration.ts";
import type { InquiryRunEnvelope } from "../world/outbound/run-envelope.ts";
import { CREATED_AT } from "./inquiry-run.builder.ts";

export function terminalEnvelope(
  body: Record<string, unknown>,
  sequence: number,
): InquiryRunEnvelope {
  return {
    schemaVersion: 1,
    runId: "run-1",
    attempt: 1,
    sequence,
    type: body.status === "succeeded" ? "run_complete" : "run_failed",
    occurredAt: CREATED_AT,
    durationMs: 0,
    data: { result: body, failureClass: "transport" },
  };
}

export function streaming(frames: (input: GraphStreamInput) => AsyncIterable<InquiryRunEnvelope>) {
  return {
    run: () => Promise.reject(new Error("run is no longer the worker path")),
    stream: frames,
    resume: () => {
      throw new Error("resume is not part of the worker path");
    },
  } satisfies OrchestrationPort;
}

export function orchestrating(answer: (input: GraphRunInput) => Promise<Record<string, unknown>>) {
  return streaming(async function* (input) {
    yield terminalEnvelope(await answer(input), 1);
  });
}

export function answering(body: Record<string, unknown>): OrchestrationPort {
  return orchestrating(() => Promise.resolve(body));
}

export function progressing(
  milestones: InquiryRunEnvelope[],
  body: Record<string, unknown>,
): OrchestrationPort {
  return streaming(async function* () {
    yield* milestones;
    yield terminalEnvelope(body, milestones.length + 1);
  });
}

export function stalling(milestones: InquiryRunEnvelope[]): OrchestrationPort {
  return streaming(async function* () {
    yield* milestones;
    await new Promise<never>(() => {});
  });
}

export function failing(error: Error): OrchestrationPort {
  return orchestrating(() => Promise.reject(error));
}

export function hanging(): OrchestrationPort {
  return orchestrating(() => new Promise<Record<string, unknown>>(() => {}));
}
