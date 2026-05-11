export interface GraphRunInput {
  graphName: string;
  input: Record<string, unknown>;
  runId?: string;
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
  stream(input: GraphRunInput): AsyncIterable<GraphEvent>;
  resume(runId: string, resumeInput: Record<string, unknown>): Promise<Record<string, unknown>>;
}
