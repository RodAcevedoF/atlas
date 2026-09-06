import type { Logger } from "@atlas/infra/logger";

export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export interface RecordingLogger {
  log: Logger;
  errors(): string[];
}

export function recordingLogger(): RecordingLogger {
  const errors: string[] = [];
  return {
    log: {
      info: () => {},
      warn: () => {},
      error: (_details, message) => errors.push(message),
    },
    errors: () => [...errors],
  };
}
