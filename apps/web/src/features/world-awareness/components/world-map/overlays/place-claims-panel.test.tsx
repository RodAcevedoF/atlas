import { afterEach, expect, test } from "bun:test";
import type { InquiryClaimRecord } from "@/features/inquiry";
import { Picker } from "@/shared/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  buildInquiryClaim,
  buildInquiryPlace,
} from "../../../../inquiry/testing/inquiry-builder.ts";
import { PlaceClaimsPanel } from "./place-claims-panel.tsx";

afterEach(cleanup);

function renderPanel(claim: InquiryClaimRecord, onClose: () => void = () => undefined) {
  return render(
    <PlaceClaimsPanel
      place={buildInquiryPlace({ claims: [claim], claimCount: 1 })}
      onClose={onClose}
    />,
  );
}

function renderClaim(sourceImageUrl: string | null) {
  return renderPanel(buildInquiryClaim({ sourceImageUrl }));
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

test("a claim date matches the readable date used on the run page", () => {
  renderClaim(null);

  expect(screen.getByText("Aug 18, 2026")).toBeDefined();
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

const confidenceCases = [
  {
    name: "a weak claim is marked low here as it is on the run page, so the map cannot flatter it",
    confidence: 0.31,
    expected: "low extraction confidence · 31%",
  },
  {
    name: "a confident claim still states its confidence, so silence never has to be interpreted",
    confidence: 0.86,
    expected: "extraction confidence · 86%",
  },
];

for (const confidenceCase of confidenceCases) {
  test(confidenceCase.name, () => {
    renderPanel(buildInquiryClaim({ confidence: confidenceCase.confidence }));

    expect(screen.getByText(confidenceCase.expected)).toBeDefined();
  });
}

test("escape closes the panel, so a reader can dismiss it without hunting for the button", () => {
  let closes = 0;
  renderPanel(buildInquiryClaim(), () => {
    closes += 1;
  });

  fireEvent.keyDown(document, { key: "Escape" });

  expect(closes).toBe(1);
});

test("escape closes an open picker before the claims panel underneath it", () => {
  let closes = 0;
  render(
    <>
      <Picker trigger="an inquiry" label="Pick an inquiry">
        {() => <span>picker content</span>}
      </Picker>
      <PlaceClaimsPanel
        place={buildInquiryPlace()}
        onClose={() => {
          closes += 1;
        }}
      />
    </>,
  );
  const trigger = screen.getByRole("button", { name: "Pick an inquiry" });
  fireEvent.click(trigger);

  fireEvent.keyDown(document.body, { key: "Escape" });

  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(closes).toBe(0);

  fireEvent.keyDown(document.body, { key: "Escape" });

  expect(closes).toBe(1);
});

test("an unrelated key leaves the panel open, so typing elsewhere never dismisses it", () => {
  let closes = 0;
  renderPanel(buildInquiryClaim(), () => {
    closes += 1;
  });

  fireEvent.keyDown(document, { key: "Enter" });

  expect(closes).toBe(0);
});

test("escape after the panel is gone closes nothing, so the listener cannot outlive the panel", () => {
  let closes = 0;
  const { unmount } = renderPanel(buildInquiryClaim(), () => {
    closes += 1;
  });

  unmount();
  fireEvent.keyDown(document, { key: "Escape" });

  expect(closes).toBe(0);
});
