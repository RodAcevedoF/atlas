import Fastify from "fastify";
import { bootstrap } from "./core/bootstrap.ts";
import { registerMarketsRoutes } from "./routes/markets.ts";
import { registerNewsRoutes } from "./routes/news.ts";
import { registerWorldRoutes } from "./routes/world.ts";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", service: "atlas-api", timestamp: new Date().toISOString() };
});

const deps = await bootstrap();
await registerMarketsRoutes(app, deps.marketsService);
await registerNewsRoutes(app, deps.newsService);
await registerWorldRoutes(app, deps.worldService);

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
