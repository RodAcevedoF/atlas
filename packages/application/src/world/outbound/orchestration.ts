export class GraphUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphUnavailableError";
  }
}

export class GraphUnreadableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphUnreadableError";
  }
}

import type { InquiryRunEnvelope } from "./run-envelope.ts";

export interface GraphRunInput {
  graphName: string;
  input: Record<string, unknown>;
  runId?: string;
}

export interface GraphStreamInput extends GraphRunInput {
  attempt: number;
}

export type GraphEventType =
  | "node:start"
  | "node:end"
  | "node:error"
  | "run:complete"
  | "run:error";

export interface GraphEvent {
  runId: string;
  node: string;
  type: GraphEventType;
  data?: unknown;
  timestamp: Date;
}

export interface OrchestrationPort {
  run(input: GraphRunInput): Promise<Record<string, unknown>>;
  stream(input: GraphStreamInput): AsyncIterable<GraphEvent | InquiryRunEnvelope>;
  resume(
    graphName: string,
    runId: string,
    resumeInput: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
