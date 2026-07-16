import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { registerAuthGate } from "./core/auth-hook.ts";
import { bootstrap } from "./core/bootstrap.ts";
import { registerErrorHandler } from "./core/error-handler.ts";
import { loggerRedactPaths, registerSecurity } from "./core/security.ts";
import { oauthPublicRoutes, readOAuthConfigs, registerOAuthRoutes } from "./modules/auth/oauth.ts";
import { registerAuthRoutes } from "./routes/auth.ts";
import { registerMarketsRoutes } from "./routes/markets.ts";
import { registerNewsRoutes } from "./routes/news.ts";
import { registerProfileRoutes } from "./routes/profile.ts";
import { registerWorldRoutes } from "./routes/world.ts";

const app = Fastify({ logger: { redact: loggerRedactPaths } });
await app.register(cookie);

app.get("/health", async () => {
  return { status: "ok", service: "atlas-api", timestamp: new Date().toISOString() };
});

const deps = await bootstrap();
const oauthConfigs = readOAuthConfigs();
await registerSecurity(app, deps.redis);
registerErrorHandler(app);
registerAuthGate(app, deps.auth.authenticate, oauthPublicRoutes(oauthConfigs));

await registerAuthRoutes(app, deps.auth);
await registerOAuthRoutes(app, deps.auth, oauthConfigs);
await registerProfileRoutes(app, deps.profile);
await registerMarketsRoutes(app, deps.markets);
await registerNewsRoutes(app, deps.news);
await registerWorldRoutes(app, deps.world);

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
