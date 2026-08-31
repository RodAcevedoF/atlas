import { expect, test } from "bun:test";
import type { InquiryPlace } from "@atlas/domain";
import { normalizeStoredPlaces } from "./inquiry-run-store.ts";

test("a historical stored claim without an image URL deserializes with an explicit null", () => {
  const historicalPlaces = [
    {
      place: "Khartoum",
      country: "Sudan",
      latitude: 15.5,
      longitude: 32.56,
      claimCount: 1,
      claims: [
        {
          text: "clashes displaced 7,800 people",
          confidence: 0.8,
          sourceUrl: "https://example.test/article",
          sourceTitle: "a headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
        },
      ],
    },
  ];

  const places: InquiryPlace[] = normalizeStoredPlaces(historicalPlaces);

  expect(places[0]?.claims[0]?.sourceImageUrl).toBeNull();
});
