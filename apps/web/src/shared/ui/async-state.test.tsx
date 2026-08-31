import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { AsyncState } from "./async-state.tsx";

afterEach(cleanup);

test("an async state announces progress without exposing its decorative evidence flow", () => {
  render(<AsyncState activity="active">Loading research…</AsyncState>);

  expect(screen.getByRole("status").textContent).toBe("Loading research…");
  expect(screen.getByRole("status").querySelector('[aria-hidden="true"]')).toBeDefined();
});

test("an async failure is announced as an alert", () => {
  render(<AsyncState tone="error">Research could not be loaded.</AsyncState>);

  expect(screen.getByRole("alert").textContent).toBe("Research could not be loaded.");
});
