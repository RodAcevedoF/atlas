import { describe, expect, test } from "bun:test";
import { readPositiveNumber } from "./run-execution.ts";

describe("readPositiveNumber", () => {
  const accepted = [
    { name: "reads a plain integer", raw: "5000", expected: 5000 },
    { name: "reads a decimal", raw: "1.5", expected: 1.5 },
    { name: "falls back when the variable is unset", raw: undefined, expected: 42 },
  ];

  for (const { name, raw, expected } of accepted) {
    test(name, () => {
      const env = raw === undefined ? {} : { TIMEOUT_MS: raw };

      const value = readPositiveNumber(env, "TIMEOUT_MS", 42);

      expect(value).toBe(expected);
    });
  }

  const rejected = [
    { name: "rejects a non-numeric value instead of silently falling back", raw: "abc" },
    { name: "rejects zero — cursor.limit(0) style holes must fail loudly", raw: "0" },
    { name: "rejects a negative number", raw: "-100" },
    { name: "rejects an empty string set in the environment", raw: "" },
  ];

  for (const { name, raw } of rejected) {
    test(name, () => {
      const env = { TIMEOUT_MS: raw };

      expect(() => readPositiveNumber(env, "TIMEOUT_MS", 42)).toThrow(
        "TIMEOUT_MS must be a positive number",
      );
    });
  }
});
