import { expect, test } from "bun:test";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { trustIngressProxy } from "./trust-proxy.ts";

test("only the configured immediate proxy supplies client addresses and independent quotas", async () => {
  const previous = process.env.TRUSTED_PROXY_IP;
  process.env.TRUSTED_PROXY_IP = "172.30.85.2";
  const app = Fastify({ trustProxy: trustIngressProxy });
  await app.register(rateLimit, { max: 2, timeWindow: "1 minute" });
  app.get("/", (request) => ({ ip: request.ip }));
  try {
    const request = (ip: string, remoteAddress = "172.30.85.2") =>
      app.inject({ url: "/", remoteAddress, headers: { "x-forwarded-for": ip } });
    const first = await request("192.0.2.1");
    await request("192.0.2.1");
    const exhausted = await request("198.51.100.99, 192.0.2.1");
    const separate = await request("192.0.2.2");
    const direct = await request("192.0.2.3", "198.51.100.1");

    expect(first.json<{ ip: string }>()).toEqual({ ip: "192.0.2.1" });
    expect(exhausted.statusCode).toBe(429);
    expect(separate.statusCode).toBe(200);
    expect(direct.json<{ ip: string }>()).toEqual({ ip: "198.51.100.1" });
    expect(trustIngressProxy("172.30.85.2", 1)).toBe(false);
    Reflect.deleteProperty(process.env, "TRUSTED_PROXY_IP");
    expect(trustIngressProxy("172.30.85.2", 0)).toBe(false);
  } finally {
    await app.close();
    if (previous === undefined) Reflect.deleteProperty(process.env, "TRUSTED_PROXY_IP");
    else process.env.TRUSTED_PROXY_IP = previous;
  }
});
