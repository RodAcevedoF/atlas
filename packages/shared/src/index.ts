export { withRetry, type RetryContext, type RetryOptions } from "./retry.ts";
export {
  fetchWithRetry,
  RetryableResponseError,
  type FetchRetryOptions,
} from "./http-retry.ts";
export { capToLimit } from "./limit-budget.ts";
export { RUN_EXECUTION_DEFAULTS, readPositiveNumber } from "./run-execution.ts";

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not yet implemented`);
    this.name = "NotImplementedError";
  }
}

export class AtlasError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AtlasError";
  }
}
