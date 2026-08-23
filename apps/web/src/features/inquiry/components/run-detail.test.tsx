import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";
import { buildInquiryRun } from "../testing/inquiry-builder.ts";
import { RunDetail } from "./run-detail.tsx";

afterEach(cleanup);

function renderRun(run: InquiryRunRecord) {
  render(
    <MemoryRouter>
      <RunDetail run={run} />
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
