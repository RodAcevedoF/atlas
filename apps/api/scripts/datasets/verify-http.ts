import assert from "node:assert/strict";
import { datasetTestApplication } from "../../src/routes/testing/datasets.ts";

const app = await datasetTestApplication();
try {
  for (const url of ["/datasets", "/datasets/example", "/datasets/example/csv"]) {
    const response = await app.inject({ method: "GET", url });
    assert.equal(response.statusCode, 401);
  }
  const response = await app.inject({
    method: "POST",
    url: "/datasets",
    headers: {
      "content-type": "text/csv",
      "x-atlas-filename": "projects.csv",
    },
    payload: "city\nPorto",
  });
  assert.equal(response.statusCode, 401);
  process.stdout.write("Anonymous dataset requests rejected under Node\n");
} finally {
  await app.close();
}
