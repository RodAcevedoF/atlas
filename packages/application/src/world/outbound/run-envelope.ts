export const INQUIRY_RUN_ENVELOPE_SCHEMA_VERSION = 1;

export const INQUIRY_RUN_ENVELOPE_TYPES = [
  "retrieval_complete",
  "map_ready",
  "synthesis_ready",
  "place_read_ready",
  "run_complete",
  "run_failed",
] as const;

export type InquiryRunEnvelopeType = (typeof INQUIRY_RUN_ENVELOPE_TYPES)[number];

export const INQUIRY_RUN_FAILURE_CLASSES = [
  "transport",
  "unusable_result",
  "timeout",
  "abandoned",
  "internal",
] as const;

export type InquiryRunFailureClass = (typeof INQUIRY_RUN_FAILURE_CLASSES)[number];

export interface InquiryRunEnvelope {
  schemaVersion: typeof INQUIRY_RUN_ENVELOPE_SCHEMA_VERSION;
  runId: string;
  attempt: number;
  sequence: number;
  type: InquiryRunEnvelopeType;
  occurredAt: Date;
  durationMs: number;
  data: Record<string, unknown>;
}

export function isTerminalRunEnvelope(envelope: InquiryRunEnvelope): boolean {
  return envelope.type === "run_complete" || envelope.type === "run_failed";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isEnvelopeType(value: unknown): value is InquiryRunEnvelopeType {
  return (
    typeof value === "string" && (INQUIRY_RUN_ENVELOPE_TYPES as readonly string[]).includes(value)
  );
}

function isFailureClass(value: unknown): value is InquiryRunFailureClass {
  return (
    typeof value === "string" && (INQUIRY_RUN_FAILURE_CLASSES as readonly string[]).includes(value)
  );
}

function asEnvelopeData(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function asRunEnvelope(value: unknown): InquiryRunEnvelope | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (row.schemaVersion !== INQUIRY_RUN_ENVELOPE_SCHEMA_VERSION) return null;
  if (typeof row.runId !== "string" || row.runId.length === 0) return null;
  if (!isPositiveInteger(row.attempt)) return null;
  if (!isPositiveInteger(row.sequence)) return null;
  if (!isEnvelopeType(row.type)) return null;
  if (typeof row.occurredAt !== "string") return null;
  const occurredAt = new Date(row.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return null;
  if (typeof row.durationMs !== "number" || !Number.isInteger(row.durationMs)) return null;
  if (row.durationMs < 0) return null;
  const data = asEnvelopeData(row.data);
  if (data === null) return null;
  if (row.type === "run_failed" && !isFailureClass(data.failureClass)) return null;
  return {
    schemaVersion: INQUIRY_RUN_ENVELOPE_SCHEMA_VERSION,
    runId: row.runId,
    attempt: row.attempt,
    sequence: row.sequence,
    type: row.type,
    occurredAt,
    durationMs: row.durationMs,
    data,
  };
}
