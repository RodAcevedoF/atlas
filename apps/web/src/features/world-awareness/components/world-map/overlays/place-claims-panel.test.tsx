import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  buildInquiryClaim,
  buildInquiryPlace,
} from "../../../../inquiry/testing/inquiry-builder.ts";
import { PlaceClaimsPanel } from "./place-claims-panel.tsx";

afterEach(cleanup);

function renderClaim(sourceImageUrl: string | null) {
  const claim = buildInquiryClaim({ sourceImageUrl });
  return render(
    <PlaceClaimsPanel
      place={buildInquiryPlace({ claims: [claim], claimCount: 1 })}
      onClose={() => undefined}
    />,
  );
}

test("an available source image is bounded and loaded without sending an Atlas referrer", () => {
  const { container } = renderClaim("https://images.example.test/article.jpg");
  const image = container.querySelector("img");
  if (!image) throw new Error("source image was not rendered");

  expect(image.getAttribute("width")).toBe("76");
  expect(image.getAttribute("height")).toBe("52");
  expect(image.getAttribute("loading")).toBe("lazy");
  expect(image.getAttribute("decoding")).toBe("async");
  expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(image.getAttribute("alt")).toBe("");
  expect(screen.getByText("clashes in and near Geissan displaced 7,800 people")).toBeDefined();
});

test("a claim without an image remains a complete text row", () => {
  const { container } = renderClaim(null);

  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("clashes in and near Geissan displaced 7,800 people")).toBeDefined();
  expect(screen.getByText("a headline")).toBeDefined();
});

test("a broken source image falls back to the unchanged text row", () => {
  const { container } = renderClaim("https://images.example.test/article.jpg");
  const image = container.querySelector("img");
  if (!image) throw new Error("source image was not rendered");

  fireEvent.error(image);

  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText("clashes in and near Geissan displaced 7,800 people")).toBeDefined();
  expect(screen.getByText("a headline")).toBeDefined();
});
