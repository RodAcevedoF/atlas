import { afterAll, beforeAll, expect, test } from "bun:test";
import { once } from "node:events";
import { createServer } from "node:http";
import { fetchJson, fetchNoContent } from "./http.ts";

let server: ReturnType<typeof createServer>;
let url: string;

beforeAll(async () => {
  server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "http://localhost");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "x-atlas-request,content-type,x-upload-name",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.method !== "GET" && request.headers["x-atlas-request"] !== "1") {
      response.writeHead(403, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid request" }));
      return;
    }
    if (request.url === "/empty") {
      response.writeHead(204).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        method: request.method,
        body: Buffer.concat(chunks).toString(),
        contentType: request.headers["content-type"] ?? null,
        customHeader: request.headers["x-upload-name"] ?? null,
        csrfHeader: request.headers["x-atlas-request"] ?? null,
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  url = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

for (const method of ["POST", "PUT", "PATCH", "DELETE", "post"]) {
  test(`${method} JSON requests pass the CSRF guard and preserve their body`, async () => {
    const response = await fetchJson(`${url}/json`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Atlas" }),
    });

    expect(response).toMatchObject({
      method: method.toUpperCase(),
      body: '{"name":"Atlas"}',
      contentType: "application/json",
    });
  });
}

for (const headers of [
  { "Content-Type": "text/plain", "X-Upload-Name": "claims.csv" },
  new Headers({ "Content-Type": "text/plain", "X-Upload-Name": "claims.csv" }),
  [
    ["Content-Type", "text/plain"],
    ["X-Upload-Name", "claims.csv"],
  ] as [string, string][],
]) {
  test(`uploads preserve ${headers.constructor.name} headers and binary content`, async () => {
    const response = await fetchJson(`${url}/upload`, {
      method: "POST",
      headers,
      body: new TextEncoder().encode("place,claim\nMadrid,example"),
    });

    expect(response).toMatchObject({
      body: "place,claim\nMadrid,example",
      contentType: "text/plain",
      customHeader: "claims.csv",
    });
  });
}

test("bodyless logout passes the CSRF guard", async () => {
  const response = await fetchJson(`${url}/logout`, { method: "POST" });

  expect(response).toMatchObject({ method: "POST", body: "" });
});

test("no-content deletion passes the CSRF guard", async () => {
  await expect(fetchNoContent(`${url}/empty`, { method: "DELETE" })).resolves.toBeUndefined();
});

test("reads do not introduce a custom CSRF header", async () => {
  const response = await fetchJson(`${url}/json`);

  expect(response).toMatchObject({ method: "GET", csrfHeader: null });
});
