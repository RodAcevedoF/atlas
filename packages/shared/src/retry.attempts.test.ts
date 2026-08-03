import { describe, expect, mock, test } from "bun:test";
import { withRetry } from "./retry.ts";

const noWait = () => Promise.resolve();
const alwaysRetry = () => true;

function operationFailingTimes(failures: number, resolvedValue = "ok") {
  let calls = 0;
  const operation = mock(() => {
    calls += 1;
    if (calls <= failures) return Promise.reject(new Error(`fail ${calls}`));
    return Promise.resolve(resolvedValue);
  });
  return operation;
}

describe("withRetry attempt behavior", () => {
  const cases = [
    { name: "succeeds on the first attempt", failures: 0, maxRetries: 3, expectedCalls: 1 },
    { name: "retries then succeeds", failures: 2, maxRetries: 3, expectedCalls: 3 },
    { name: "succeeds on the final allowed retry", failures: 3, maxRetries: 3, expectedCalls: 4 },
  ];

  for (const { name, failures, maxRetries, expectedCalls } of cases) {
    test(name, async () => {
      const operation = operationFailingTimes(failures);

      const result = await withRetry(operation, {
        maxRetries,
        shouldRetry: alwaysRetry,
        sleep: noWait,
      });

      expect(result).toBe("ok");
      expect(operation).toHaveBeenCalledTimes(expectedCalls);
    });
  }

  test("rethrows the last error once retries are exhausted", async () => {
    const operation = operationFailingTimes(Number.POSITIVE_INFINITY);

    const outcome = withRetry(operation, {
      maxRetries: 2,
      shouldRetry: alwaysRetry,
      sleep: noWait,
    });

    await expect(outcome).rejects.toThrow("fail 3");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test("does not retry when shouldRetry rejects the error", async () => {
    const operation = operationFailingTimes(Number.POSITIVE_INFINITY);

    const outcome = withRetry(operation, {
      maxRetries: 3,
      shouldRetry: () => false,
      sleep: noWait,
    });

    await expect(outcome).rejects.toThrow("fail 1");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test("never sleeps when the first attempt succeeds", async () => {
    const sleep = mock(noWait);
    const operation = operationFailingTimes(0);

    await withRetry(operation, { shouldRetry: alwaysRetry, sleep });

    expect(sleep).toHaveBeenCalledTimes(0);
  });
});
