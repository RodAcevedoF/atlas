import { describe, expect, test } from "bun:test";
import { buildInquiryPlace, buildInquiryRun } from "../../../../inquiry/testing/inquiry-builder.ts";
import { findSelectedPlace, readPlaceIdentity } from "./place-selection.ts";

describe("readPlaceIdentity", () => {
  test("a clicked orb yields the place it was painted from", () => {
    const identity = readPlaceIdentity({ place: "Khartoum", country: "Sudan", claimCount: 3 });

    expect(identity).toEqual({ place: "Khartoum", country: "Sudan" });
  });

  test("a place with no country survives maplibre dropping the null property", () => {
    const identity = readPlaceIdentity({ place: "Antarctic Peninsula" });

    expect(identity).toEqual({ place: "Antarctic Peninsula", country: null });
  });

  test("clicking the map away from any orb selects nothing", () => {
    expect(readPlaceIdentity(undefined)).toBeNull();
  });
});

describe("findSelectedPlace", () => {
  test("a selected orb resolves to that place's claims", () => {
    const khartoum = buildInquiryPlace({ place: "Khartoum", country: "Sudan" });
    const run = buildInquiryRun({ id: "run-a", places: [khartoum] });

    const found = findSelectedPlace(run, { runId: "run-a", place: "Khartoum", country: "Sudan" });

    expect(found).toBe(khartoum);
  });

  test("places sharing a name are told apart by their country", () => {
    const spain = buildInquiryPlace({ place: "Valencia", country: "Spain" });
    const venezuela = buildInquiryPlace({ place: "Valencia", country: "Venezuela" });
    const run = buildInquiryRun({ id: "run-a", places: [spain, venezuela] });

    const found = findSelectedPlace(run, {
      runId: "run-a",
      place: "Valencia",
      country: "Venezuela",
    });

    expect(found).toBe(venezuela);
  });

  test("a selection made on another run does not survive switching runs", () => {
    const run = buildInquiryRun({
      id: "run-b",
      places: [buildInquiryPlace({ place: "Khartoum", country: "Sudan" })],
    });

    const found = findSelectedPlace(run, { runId: "run-a", place: "Khartoum", country: "Sudan" });

    expect(found).toBeNull();
  });

  test("a place absent from the shown run resolves to nothing", () => {
    const run = buildInquiryRun({
      id: "run-a",
      places: [buildInquiryPlace({ place: "Khartoum", country: "Sudan" })],
    });

    const found = findSelectedPlace(run, { runId: "run-a", place: "El Fasher", country: "Sudan" });

    expect(found).toBeNull();
  });

  test("nothing is selected while the run detail is still loading", () => {
    expect(
      findSelectedPlace(null, { runId: "run-a", place: "Khartoum", country: "Sudan" }),
    ).toBeNull();
  });
});
