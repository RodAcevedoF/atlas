import type { InquiryRepository } from "../repositories/inquiry-repository.ts";
import { type WatchInquiryRun, isInquiryRunSettled } from "./watch-inquiry-run.ts";

export interface PollSchedule {
  intervalMs: number;
  limitMs: number;
}

export const INQUIRY_POLL_SCHEDULE: PollSchedule = { intervalMs: 3_000, limitMs: 180_000 };

export interface PollInquiryRunDeps {
  inquiryRepository: InquiryRepository;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function makePollInquiryRun(
  { inquiryRepository }: PollInquiryRunDeps,
  schedule: PollSchedule,
): WatchInquiryRun {
  return async (requested, onProgress) => {
    if (isInquiryRunSettled(requested.status)) {
      return { status: requested.status, isStillRunning: false };
    }
    onProgress(requested.status);

    const deadline = Date.now() + schedule.limitMs;
    let status = requested.status;

    while (Date.now() < deadline) {
      await delay(schedule.intervalMs);
      const run = await inquiryRepository.runById(requested.runId);
      status = run.status;
      onProgress(status);
      if (isInquiryRunSettled(status)) return { status, isStillRunning: false };
    }

    return { status, isStillRunning: true };
  };
}
