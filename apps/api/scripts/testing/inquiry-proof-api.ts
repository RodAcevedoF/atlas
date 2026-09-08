import { StreamInquiryRunUseCase } from "@atlas/application";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { RedisInquiryRunSubscriptions } from "@atlas/infra/inquiry-updates-redis";
import { createLogger } from "@atlas/infra/logger";
import { createWatchedRedisClient } from "@atlas/infra/redis-client";
import { MongoInquiryRunStore, createMongoClient } from "@atlas/infra/store-mongodb";
import Fastify from "fastify";
import { writeInquiryRunStream } from "../../src/modules/inquiry/run-events.ts";

const mongo = createMongoClient("mongodb://127.0.0.1:17017");
await mongo.connect();
const subscriber = createWatchedRedisClient("redis://127.0.0.1:16379", { name: "proof-api" });
const stream = new StreamInquiryRunUseCase(
  new MongoInquiryRunStore(mongo.db("atlas_p7")),
  new RedisInquiryRunSubscriptions(subscriber, createLogger()),
);
const app = Fastify();
app.get<{ Params: { id: string } }>("/runs/:id/events", async (request, reply) => {
  const owner = request.headers["x-proof-owner"];
  if (typeof owner !== "string") return reply.code(401).send();
  const opened = await stream.execute(makeInquiryRunId(request.params.id), {
    id: makeUserId(owner),
    role: "user",
  });
  if (!opened) return reply.code(404).send();
  return writeInquiryRunStream(reply, opened);
});
await app.listen({ host: "127.0.0.1", port: Number(process.argv[2]) });
console.log("proof api ready");
