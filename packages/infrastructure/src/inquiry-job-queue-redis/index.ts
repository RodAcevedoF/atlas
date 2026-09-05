import type { InquiryJob, InquiryJobPublisherPort, InquiryJobQueuePort } from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import type { Redis } from "ioredis";

export const INQUIRY_JOB_STREAM = "inquiry:v1:jobs";
export const INQUIRY_JOB_GROUP = "inquiry:v1:workers";
export const INQUIRY_DEAD_LETTER_STREAM = "inquiry:v1:jobs:dead";

const RUN_ID_FIELD = "runId";
const JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DEAD_LETTER_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type StreamEntry = [string, string[]];

export interface InquiryJobQueueConfig {
  consumerName: string;
  blockMs: number;
}

function fieldValue(fields: string[], name: string): string | null {
  for (let index = 0; index + 1 < fields.length; index += 2) {
    if (fields[index] === name) return fields[index + 1] ?? null;
  }
  return null;
}

interface ParsedEntries {
  jobs: InquiryJob[];
  unreadable: StreamEntry[];
}

function parseEntries(entries: StreamEntry[]): ParsedEntries {
  const jobs: InquiryJob[] = [];
  const unreadable: StreamEntry[] = [];
  for (const entry of entries) {
    const [deliveryId, fields] = entry;
    const runId = fieldValue(fields, RUN_ID_FIELD);
    if (runId) jobs.push({ runId: makeInquiryRunId(runId), deliveryId });
    else unreadable.push(entry);
  }
  return { jobs, unreadable };
}

function isMissingGroup(error: unknown): boolean {
  return error instanceof Error && error.message.includes("NOGROUP");
}

function isExistingGroup(error: unknown): boolean {
  return error instanceof Error && error.message.includes("BUSYGROUP");
}

export function isCommandTimeout(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Command timed out");
}

export class RedisInquiryJobPublisher implements InquiryJobPublisherPort {
  constructor(protected readonly redis: Redis) {}

  async publish(runId: InquiryRunId): Promise<void> {
    await this.redis.xadd(
      INQUIRY_JOB_STREAM,
      "MINID",
      "~",
      String(Date.now() - JOB_RETENTION_MS),
      "*",
      RUN_ID_FIELD,
      runId,
    );
  }
}

export class RedisInquiryJobQueue extends RedisInquiryJobPublisher implements InquiryJobQueuePort {
  constructor(
    redis: Redis,
    private readonly blocking: Redis,
    private readonly config: InquiryJobQueueConfig,
  ) {
    super(redis);
  }

  async ensureGroup(): Promise<void> {
    try {
      await this.redis.xgroup("CREATE", INQUIRY_JOB_STREAM, INQUIRY_JOB_GROUP, "0-0", "MKSTREAM");
    } catch (error) {
      if (!isExistingGroup(error)) throw error;
    }
  }

  async reserve(limit: number): Promise<InquiryJob[]> {
    const response = await this.readGroup(limit);
    if (!response) return [];

    const jobs: InquiryJob[] = [];
    for (const stream of response) {
      const [, entries] = stream;
      jobs.push(...(await this.settleParsed(entries)));
    }
    return jobs;
  }

  async refreshOwnership(deliveryId: string): Promise<void> {
    await this.redis.xclaim(
      INQUIRY_JOB_STREAM,
      INQUIRY_JOB_GROUP,
      this.config.consumerName,
      0,
      deliveryId,
      "JUSTID",
    );
  }

  async acknowledge(deliveryId: string): Promise<void> {
    await this.redis.xack(INQUIRY_JOB_STREAM, INQUIRY_JOB_GROUP, deliveryId);
  }

  async deadLetter(job: InquiryJob, reason: string): Promise<void> {
    await this.redis.xadd(
      INQUIRY_DEAD_LETTER_STREAM,
      "MINID",
      "~",
      String(Date.now() - DEAD_LETTER_RETENTION_MS),
      "*",
      RUN_ID_FIELD,
      job.runId,
      "reason",
      reason,
    );
    await this.acknowledge(job.deliveryId);
  }

  async reclaimStale(idleMs: number, limit: number): Promise<InquiryJob[]> {
    const response = await this.redis.xautoclaim(
      INQUIRY_JOB_STREAM,
      INQUIRY_JOB_GROUP,
      this.config.consumerName,
      idleMs,
      "0-0",
      "COUNT",
      limit,
    );
    const entries = (response as unknown[])[1] as StreamEntry[] | undefined;
    return entries ? await this.settleParsed(entries) : [];
  }

  private async settleParsed(entries: StreamEntry[]): Promise<InquiryJob[]> {
    const { jobs, unreadable } = parseEntries(entries);
    for (const [deliveryId, fields] of unreadable) {
      await this.redis.xadd(
        INQUIRY_DEAD_LETTER_STREAM,
        "MINID",
        "~",
        String(Date.now() - DEAD_LETTER_RETENTION_MS),
        "*",
        ...fields,
        "reason",
        "unreadable inquiry job entry",
      );
      await this.acknowledge(deliveryId);
    }
    return jobs;
  }

  private async readGroup(limit: number): Promise<[string, StreamEntry[]][] | null> {
    try {
      const response = await this.blocking.xreadgroup(
        "GROUP",
        INQUIRY_JOB_GROUP,
        this.config.consumerName,
        "COUNT",
        limit,
        "BLOCK",
        this.config.blockMs,
        "STREAMS",
        INQUIRY_JOB_STREAM,
        ">",
      );
      return response as [string, StreamEntry[]][] | null;
    } catch (error) {
      if (!isMissingGroup(error)) throw error;
      await this.ensureGroup();
      return null;
    }
  }
}
