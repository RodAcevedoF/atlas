import { expect, test } from "bun:test";
import { createLogger } from "@atlas/infra/logger";
import { createWatchedRedisClient } from "@atlas/infra/redis-client";
import Fastify from "fastify";
import { registerErrorHandler } from "./error-handler.ts";
import { registerSecurity } from "./security.ts";

const url = process.env.SECURITY_TEST_REDIS_URL;

test.skipIf(!url)(
  "rate limits reject writes during a Redis outage and recover afterward",
  async () => {
    if (!url) throw new Error("SECURITY_TEST_REDIS_URL must point to a disposable isolated Redis");
    const log = createLogger({ level: "silent" });
    const redis = createWatchedRedisClient(url, { name: "rate-limit-test", timeoutMs: 200, log });
    const control = createWatchedRedisClient(url, { name: "rate-limit-control", log });
    const app = Fastify();
    const remoteAddress = `2001:db8::${crypto.randomUUID().slice(0, 4)}:${crypto.randomUUID().slice(0, 4)}`;
    const accepted: string[] = [];
    await registerSecurity(app, redis);
    registerErrorHandler(app);
    app.post("/global", () => {
      accepted.push("global");
      return { accepted: true };
    });
    app.post("/limited", { config: { rateLimit: { max: 1, timeWindow: "1 minute" } } }, () => {
      accepted.push("limited");
      return { accepted: true };
    });
    const request = (path: string) =>
      app.inject({ method: "POST", url: path, remoteAddress, headers: { "x-atlas-request": "1" } });

    try {
      await Promise.all([redis.ping(), control.ping()]);
      expect((await request("/global")).statusCode).toBe(200);
      expect((await request("/limited")).statusCode).toBe(200);
      expect((await request("/limited")).statusCode).toBe(429);
      await control.call("CLIENT", "PAUSE", "500", "ALL");

      const blocked = await Promise.all([request("/global"), request("/limited")]);

      expect(blocked.map((response) => response.statusCode)).toEqual([500, 500]);
      expect(blocked.map((response) => response.json())).toEqual([
        { error: "Internal server error" },
        { error: "Internal server error" },
      ]);
      expect(accepted).toEqual(["global", "limited"]);

      await Bun.sleep(1_500);
      expect((await request("/global")).statusCode).toBe(200);
      expect(accepted).toEqual(["global", "limited", "global"]);
    } finally {
      await app.close();
      redis.disconnect();
      control.disconnect();
    }
  },
);
