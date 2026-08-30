import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MapFieldState } from "./map-field-state.tsx";

afterEach(cleanup);

const BASE_STATE = {
  isPainting: false,
  isResolving: false,
  hasLatestRun: false,
  isLoading: false,
  hasError: false,
};

test("the map explains that recent research is loading before its history arrives", () => {
  render(<MapFieldState {...BASE_STATE} isLoading />);

  expect(screen.getByText("Loading your recent research…")).toBeDefined();
});

test("the map distinguishes locating a selected run from loading its history", () => {
  render(<MapFieldState {...BASE_STATE} isLoading isResolving />);

  expect(screen.getByText("Locating this run's claims…")).toBeDefined();
});

test("an account without research gets a useful map empty state", () => {
  render(<MapFieldState {...BASE_STATE} />);

  expect(screen.getByText("Ask a question to place its claims on the map.")).toBeDefined();
});

test("the field stays clear when map data or a more specific status is already visible", () => {
  const occupiedStates = [
    { name: "painted claims", state: { isPainting: true } },
    { name: "a run outcome", state: { hasLatestRun: true } },
    { name: "an error", state: { hasError: true } },
  ];

  for (const occupied of occupiedStates) {
    const { unmount } = render(<MapFieldState {...BASE_STATE} {...occupied.state} />);

    expect(screen.queryByText(/Loading|Locating|Ask a question/), occupied.name).toBeNull();
    unmount();
  }
});
