import Fastify from "fastify";
import { bootstrap } from "./core/bootstrap.ts";
import { registerMarketRoutes } from "./routes/market/ingest.ts";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "atlas-api", timestamp: new Date().toISOString() };
});

const deps = await bootstrap();
await registerMarketRoutes(app, deps);

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
