import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";
import {
  buildInquiryClaim,
  buildInquiryPlace,
  buildInquiryRun,
} from "../testing/inquiry-builder.ts";
import { RunDetail } from "./run-detail.tsx";

afterEach(cleanup);

function renderRun(run: InquiryRunRecord) {
  render(
    <MemoryRouter>
      <RunDetail run={run} onDelete={null} />
    </MemoryRouter>,
  );
}

describe("RunDetail states what a run cost", () => {
  test("names the figure retrieval, because it is Exa's share and not the whole run", () => {
    renderRun(buildInquiryRun({ retrievalCostUsd: 0.047 }));

    expect(screen.getByText("· retrieval $0.047")).toBeDefined();
  });

  test("a run that never retrieved shows nothing rather than a confident $0.000", () => {
    renderRun(
      buildInquiryRun({
        retrievalCostUsd: 0,
        status: "failed_permanent",
        error: "response carried no timeline",
      }),
    );

    expect(screen.queryByText(/retrieval/)).toBeNull();
  });
});

describe("RunDetail keeps claims traceable", () => {
  test("a claim names and links its source, publication date, and extraction confidence", () => {
    const claim = buildInquiryClaim({ publishedDate: "2026-08-18T12:00:00.000Z" });
    renderRun(buildInquiryRun({ places: [buildInquiryPlace({ claims: [claim] })] }));

    const sourceLink = screen.getByRole("link", { name: new RegExp(claim.text) });
    expect(sourceLink.getAttribute("href")).toBe(claim.sourceUrl);
    expect(sourceLink.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("a headline")).toBeDefined();
    expect(screen.getByText("Aug 18, 2026")).toBeDefined();
    expect(screen.getByText("extraction confidence · 80%")).toBeDefined();
  });

  test("a place read appears above its claims and links every supporting source", () => {
    const firstClaim = buildInquiryClaim({
      sourceUrl: "https://example.test/article-1",
      sourceTitle: "First report",
    });
    const secondClaim = buildInquiryClaim({
      text: "aid routes were disrupted",
      sourceUrl: "https://example.test/article-2",
      sourceTitle: "Second report",
    });
    const read = {
      text: "Reports describe displacement and disrupted aid routes.",
      sourceUrls: [firstClaim.sourceUrl, secondClaim.sourceUrl],
    };
    renderRun(
      buildInquiryRun({
        claimCount: 2,
        places: [buildInquiryPlace({ claimCount: 2, claims: [firstClaim, secondClaim], read })],
      }),
    );

    expect(screen.getByText(read.text)).toBeDefined();
    expect(screen.getByRole("link", { name: "source 1" }).getAttribute("href")).toBe(
      firstClaim.sourceUrl,
    );
    expect(screen.getByRole("link", { name: "source 2" }).getAttribute("href")).toBe(
      secondClaim.sourceUrl,
    );
  });

  test("a weak extraction is explicitly labelled low confidence", () => {
    const claim = buildInquiryClaim({ confidence: 0.3 });
    renderRun(buildInquiryRun({ places: [buildInquiryPlace({ claims: [claim] })] }));

    expect(screen.getByText("low extraction confidence · 30%")).toBeDefined();
  });
});
