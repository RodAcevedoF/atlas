import { describe, expect, test } from "bun:test";
import type { AuthStatus } from "@/features/auth/auth-provider.tsx";
import { homeDestination } from "./home-destination.ts";

const CASES: Array<{ name: string; status: AuthStatus; to: string; label: string }> = [
  {
    name: "a signed-in reader goes back to their map",
    status: "authenticated",
    to: "/world",
    label: "Back to the map",
  },
  {
    name: "a visitor goes back to the public landing",
    status: "anonymous",
    to: "/",
    label: "Back to Atlas",
  },
  {
    name: "an unresolved session is not assumed to be signed in",
    status: "loading",
    to: "/",
    label: "Back to Atlas",
  },
  {
    name: "a failed session lookup lands somewhere reachable",
    status: "error",
    to: "/",
    label: "Back to Atlas",
  },
];

describe("homeDestination", () => {
  for (const testCase of CASES) {
    test(testCase.name, () => {
      const destination = homeDestination(testCase.status);

      expect(destination.to).toBe(testCase.to);
      expect(destination.label).toBe(testCase.label);
    });
  }
});
