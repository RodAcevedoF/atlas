import { afterEach, expect, test } from "bun:test";
import { type Dataset, makeUserId } from "@atlas/domain";
import { act, cleanup, renderHook } from "@testing-library/react";
import { DatasetProvider } from "../dataset-provider.tsx";
import { MemoryDatasetRepository } from "../testing/dataset-repository.fake.ts";
import { useDatasets } from "./use-datasets.ts";

afterEach(cleanup);

for (const unmountBeforeDownload of [false, true]) {
  test(`pending download attaches only while mounted: unmounted=${unmountBeforeDownload}`, async () => {
    const dataset: Dataset = {
      id: "private",
      ownerId: makeUserId("owner-a"),
      name: "private.csv",
      columns: ["city"],
      recordCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const file = new File(["city\nPorto"], "private.csv", { type: "text/csv" });
    const completion = Promise.withResolvers<void>();
    class DelayedDatasetRepository extends MemoryDatasetRepository {
      async file(selected: Dataset): Promise<File> {
        const downloaded = await super.file(selected);
        await completion.promise;
        return downloaded;
      }
    }
    const repository = new DelayedDatasetRepository([dataset], new Map([[dataset.id, file]]));
    const attachments: File[] = [];
    const { result, unmount } = renderHook(() => useDatasets((file) => attachments.push(file)), {
      wrapper: ({ children }) => (
        <DatasetProvider repository={repository}>{children}</DatasetProvider>
      ),
    });

    let operation = Promise.resolve();
    act(() => {
      operation = result.current.use(dataset);
    });
    if (unmountBeforeDownload) unmount();
    completion.resolve();
    await act(async () => {
      await operation;
    });

    expect(attachments).toEqual(unmountBeforeDownload ? [] : [file]);
  });
}
