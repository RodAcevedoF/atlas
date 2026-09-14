import { AuthenticateUseCase, datasetCsv } from "@atlas/application";
import {
  type Dataset,
  type SavedDataset,
  emptyProfile,
  makeSessionToken,
  makeUserId,
} from "@atlas/domain";
import { ExcelJsDatasetParser, datasetWorkbook } from "@atlas/infra/tabular-parser";
import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { MemorySessions } from "../../../../../packages/application/src/auth/testing/sessions.ts";
import { MemoryDatasetStore } from "../../../../../packages/application/src/datasets/testing/dataset-store.fake.ts";
import { inMemoryUserStore } from "../../../../../packages/application/src/testing/user-store.fake.ts";
import { registerAuthGate } from "../../core/auth-hook.ts";
import { registerErrorHandler } from "../../core/error-handler.ts";
import { makeDatasetDependencies } from "../../modules/datasets/dependencies.ts";
import { registerDatasetRoutes } from "../datasets.ts";

export async function datasetTestApplication() {
  const app = Fastify();
  await app.register(cookie);
  app.addContentTypeParser(
    ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );
  const sessions = new MemorySessions();
  const users = ["owner", "other"].map((name) => ({
    id: makeUserId(name),
    email: `${name}@example.com`,
    emailVerified: true,
    role: "user" as const,
    profile: emptyProfile(),
    identities: [],
    createdAt: new Date(),
  }));
  for (const user of users) {
    await sessions.create({
      token: makeSessionToken(user.id),
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });
  }
  registerAuthGate(app, new AuthenticateUseCase(sessions, inMemoryUserStore(users).store));
  registerErrorHandler(app);
  await registerDatasetRoutes(
    app,
    makeDatasetDependencies(new MemoryDatasetStore(), new ExcelJsDatasetParser()),
  );
  return app;
}
