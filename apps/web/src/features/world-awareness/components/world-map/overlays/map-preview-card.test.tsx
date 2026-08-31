import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MapPreviewCard } from "./map-preview-card.tsx";

afterEach(cleanup);

test("a cluster preview names both totals without changing the map", () => {
  render(
    <MapPreviewCard
      anchored={{
        preview: { kind: "cluster", placeCount: 8, claimCount: 21 },
        x: 100,
        y: 80,
        dataKey: null,
      }}
    />,
  );

  expect(screen.getByText("8 places · 21 claims")).toBeDefined();
});

test("an orb preview names the place, distinct country, and claims", () => {
  render(
    <MapPreviewCard
      anchored={{
        preview: { kind: "orb", place: "Khartoum", country: "Sudan", claimCount: 3 },
        x: 100,
        y: 80,
        dataKey: null,
      }}
    />,
  );

  expect(screen.getByText("Khartoum")).toBeDefined();
  expect(screen.getByText("Sudan")).toBeDefined();
  expect(screen.getByText("3 claims")).toBeDefined();
});
