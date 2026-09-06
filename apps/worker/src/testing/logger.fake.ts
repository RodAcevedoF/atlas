import type { Logger } from "@atlas/infra/logger";

export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
