import { afterEach, expect, test } from "bun:test";
import { type Dataset, makeUserId } from "@atlas/domain";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { DatasetProvider } from "../dataset-provider.tsx";
import { MemoryDatasetRepository } from "../testing/dataset-repository.fake.ts";
import { SavedDatasets } from "./saved-datasets.tsx";

afterEach(cleanup);

const dataset: Dataset = {
  id: "demo",
  ownerId: makeUserId("owner"),
  name: "projects.xlsx",
  columns: ["city"],
  recordCount: 120,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function ResearchInput({ repository }: { repository: MemoryDatasetRepository }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <DatasetProvider repository={repository}>
      <SavedDatasets onUse={setFile} disabled={false} />
      <output>{file ? `Attached ${file.name}` : "No attachment"}</output>
    </DatasetProvider>
  );
}

test("a saved dataset can be selected as a research attachment", async () => {
  const repository = new MemoryDatasetRepository(
    [dataset],
    new Map([[dataset.id, new File(["city\nPorto"], "projects.csv", { type: "text/csv" })]]),
  );
  render(<ResearchInput repository={repository} />);
  fireEvent.click(screen.getByRole("button", { name: "Saved datasets" }));
  await screen.findByText("projects.xlsx · 120 rows");
  fireEvent.click(screen.getByRole("button", { name: "Use" }));

  await screen.findByText("Attached projects.csv");
  expect(screen.queryByRole("button", { name: "Use" })).toBeNull();
});

test("deleting a dataset removes it from the saved list", async () => {
  const repository = new MemoryDatasetRepository([dataset], new Map());
  render(<ResearchInput repository={repository} />);
  fireEvent.click(screen.getByRole("button", { name: "Saved datasets" }));
  await screen.findByText("projects.xlsx · 120 rows");
  fireEvent.click(screen.getByRole("button", { name: "Delete projects.xlsx" }));

  await screen.findByText("No saved datasets yet.");
  expect(await repository.list()).toEqual([]);
});

test("a failed download leaves the research input unchanged and explains the failure", async () => {
  render(<ResearchInput repository={new MemoryDatasetRepository([dataset], new Map())} />);
  fireEvent.click(screen.getByRole("button", { name: "Saved datasets" }));
  await screen.findByText("projects.xlsx · 120 rows");
  fireEvent.click(screen.getByRole("button", { name: "Use" }));

  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("Dataset file is unavailable"),
  );
  expect(screen.getByText("No attachment")).toBeDefined();
});
