import { afterEach, beforeEach, expect, test } from "bun:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerRequestSecurity } from "./request-security.ts";

let app: FastifyInstance;
let mutations: number;

beforeEach(async () => {
  app = Fastify();
  mutations = 0;
  await registerRequestSecurity(app, ["https://atlas.example"]);
  app.route({
    method: ["POST", "PUT", "PATCH", "DELETE"],
    url: "/auth/logout",
    handler: async () => ({ mutations: ++mutations }),
  });
  app.get("/auth/google/callback", async () => ({ ok: true }));
});

afterEach(async () => {
  await app.close();
});

for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
  for (const headers of [{}, { "x-atlas-request": "" }, { "x-atlas-request": "0" }]) {
    test(`${method} refuses a missing or invalid header ${JSON.stringify(headers)}`, async () => {
      const response = await app.inject({
        method,
        url: "/auth/logout",
        headers: { cookie: "atlas_session=existing-session", ...headers },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json<{ error: string }>()).toEqual({ error: "Invalid request" });
      expect(mutations).toBe(0);
    });
  }

  test(`${method} accepts the application header`, async () => {
    const response = await app.inject({
      method,
      url: "/auth/logout",
      headers: { "x-atlas-request": "1" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ mutations: number }>()).toEqual({ mutations: 1 });
  });
}

for (const contentType of [
  "text/plain",
  "application/x-www-form-urlencoded",
  "multipart/form-data; boundary=attack",
  "application/json",
]) {
  test(`rejects ${contentType} before parsing or mutation`, async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { origin: "https://evil.example", "content-type": contentType },
      payload: "{}",
    });

    expect(response.statusCode).toBe(403);
    expect(mutations).toBe(0);
  });
}

for (const method of ["GET", "HEAD"] as const) {
  test(`${method} navigation does not require the mutation header`, async () => {
    const response = await app.inject({ method, url: "/auth/google/callback" });

    expect(response.statusCode).toBe(200);
  });
}

for (const origin of ["https://evil.example", "https://atlas.example.evil.example", "null"]) {
  test(`preflight does not grant mutation access to ${origin}`, async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/auth/logout",
      headers: {
        origin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "x-atlas-request",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(mutations).toBe(0);
  });
}

for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
  test(`an explicitly trusted browser origin can preflight and ${method}`, async () => {
    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/auth/logout",
      headers: {
        origin: "https://atlas.example",
        "access-control-request-method": method,
        "access-control-request-headers": "x-atlas-request,content-type",
      },
    });
    const response = await app.inject({
      method,
      url: "/auth/logout",
      headers: { origin: "https://atlas.example", "x-atlas-request": "1" },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("https://atlas.example");
    expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
    expect(preflight.headers["access-control-allow-headers"]).toContain("x-atlas-request");
    expect(preflight.headers["access-control-allow-methods"]).toContain(method);
    expect(response.statusCode).toBe(200);
    expect(response.json<{ mutations: number }>()).toEqual({ mutations: 1 });
  });
}

test("unset CORS origins do not grant cross-origin access", async () => {
  const sameOriginApp = Fastify();
  await registerRequestSecurity(sameOriginApp, false);
  sameOriginApp.post("/auth/login", async () => ({ ok: true }));

  try {
    const response = await sameOriginApp.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "POST",
        "access-control-request-headers": "x-atlas-request",
      },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  } finally {
    await sameOriginApp.close();
  }
});
