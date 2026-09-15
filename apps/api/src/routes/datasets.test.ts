import { expect, test } from "bun:test";
import { AuthenticateUseCase, datasetCsv } from "@atlas/application";
import {
  type Dataset,
  type DatasetSheetPreview,
  type SavedDataset,
  emptyProfile,
  makeSessionToken,
  makeUserId,
} from "@atlas/domain";
import { ExcelJsDatasetParser, datasetWorkbook } from "@atlas/infra/tabular-parser";
import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { MemorySessions } from "../../../../packages/application/src/auth/testing/sessions.ts";
import { MemoryDatasetStore } from "../../../../packages/application/src/datasets/testing/dataset-store.fake.ts";
import { inMemoryUserStore } from "../../../../packages/application/src/testing/user-store.fake.ts";
import { multiSheetWorkbook } from "../../../../packages/infrastructure/src/tabular-parser/testing/dataset-workbook.ts";
import { registerAuthGate } from "../core/auth-hook.ts";
import { registerErrorHandler } from "../core/error-handler.ts";
import { makeDatasetDependencies } from "../modules/datasets/dependencies.ts";
import { registerDatasetRoutes } from "./datasets.ts";
import { datasetTestApplication } from "./testing/datasets.ts";

for (const format of ["csv", "xlsx"]) {
  test(`${format} upload, owner download and reuse preserve all rows`, async () => {
    const app = await datasetTestApplication();
    const table = {
      columns: ["city", "budget"],
      rows: [
        ["Porto", "120000"],
        ["Valencia", "130000"],
      ],
    };
    const bytes =
      format === "csv" ? Buffer.from(datasetCsv(table)) : Buffer.from(await datasetWorkbook(table));
    try {
      const response = await app.inject({
        method: "POST",
        url: "/datasets",
        cookies: { atlas_session: "owner" },
        headers: {
          "content-type":
            format === "csv"
              ? "text/csv"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "x-atlas-filename": `projects.${format}`,
        },
        payload: bytes,
      });
      expect(response.statusCode).toBe(201);
      const dataset = response.json<Dataset[]>()[0];
      if (!dataset) throw new Error("Expected an imported dataset");
      const detail = await app.inject({
        method: "GET",
        url: `/datasets/${dataset.id}`,
        cookies: { atlas_session: "owner" },
      });
      expect(detail.json<SavedDataset>().records.map((record) => record.values)).toEqual(
        table.rows,
      );
      const download = await app.inject({
        method: "GET",
        url: `/datasets/${dataset.id}/csv`,
        cookies: { atlas_session: "owner" },
      });
      expect(download.statusCode).toBe(200);
      expect(download.body).toBe(datasetCsv(table));
      expect(download.headers["cache-control"]).toBe("private, no-store");
      for (const suffix of ["", "/csv"]) {
        const forbidden = await app.inject({
          method: "GET",
          url: `/datasets/${dataset.id}${suffix}`,
          cookies: { atlas_session: "other" },
        });
        expect(forbidden.statusCode).toBe(404);
      }
      const listed = await app.inject({
        method: "GET",
        url: "/datasets",
        cookies: { atlas_session: "other" },
      });
      expect(listed.json<Dataset[]>()).toEqual([]);
    } finally {
      await app.close();
    }
  });
}

test("invalid dataset content returns a client error without persisting data", async () => {
  const app = await datasetTestApplication();
  try {
    const invalid = await app.inject({
      method: "POST",
      url: "/datasets",
      cookies: { atlas_session: "owner" },
      headers: { "content-type": "text/csv", "x-atlas-filename": "bad.csv" },
      payload: "city,City\na,b",
    });
    expect(invalid.statusCode).toBe(400);
    expect(
      (
        await app.inject({ method: "GET", url: "/datasets", cookies: { atlas_session: "owner" } })
      ).json<Dataset[]>(),
    ).toEqual([]);
  } finally {
    await app.close();
  }
});

for (const selection of [undefined, "Customers"]) {
  test(`workbook preview and ${selection ?? "all worksheets"} import preserve each table`, async () => {
    const app = await datasetTestApplication();
    const sheets = [
      { name: "Vehicles", columns: ["VIN", "Brand"], rows: [["001", "Seat"]] },
      { name: "Customers", columns: ["ID", "Name"], rows: [["01", "Ana"]] },
    ];
    const payload = Buffer.from(await multiSheetWorkbook(sheets));
    const headers = {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "x-atlas-filename": "dealer.xlsx",
    };
    try {
      const preview = await app.inject({
        method: "POST",
        url: "/datasets/preview",
        cookies: { atlas_session: "owner" },
        headers,
        payload,
      });
      expect(preview.statusCode).toBe(200);
      expect(preview.json<DatasetSheetPreview[]>()).toEqual(
        sheets.map((sheet) => ({ name: sheet.name, rowCount: 1, columnCount: 2 })),
      );
      expect(
        (
          await app.inject({ method: "GET", url: "/datasets", cookies: { atlas_session: "owner" } })
        ).json<Dataset[]>(),
      ).toEqual([]);

      const response = await app.inject({
        method: "POST",
        url: "/datasets",
        cookies: { atlas_session: "owner" },
        headers: {
          ...headers,
          ...(selection === undefined ? {} : { "x-atlas-worksheet": selection }),
        },
        payload,
      });
      expect(response.statusCode).toBe(201);
      const datasets = response.json<Dataset[]>();
      const selected =
        selection === undefined ? sheets : sheets.filter((sheet) => sheet.name === selection);
      expect(datasets.map((dataset) => dataset.name)).toEqual(
        selected.map((sheet) => `dealer — ${sheet.name}.xlsx`),
      );
      for (const [index, dataset] of datasets.entries()) {
        const sheet = selected[index];
        if (!sheet) throw new Error("Expected a selected sheet");
        const download = await app.inject({
          method: "GET",
          url: `/datasets/${dataset.id}/csv`,
          cookies: { atlas_session: "owner" },
        });
        expect(download.body).toBe(datasetCsv(sheet));
      }
    } finally {
      await app.close();
    }
  });
}
