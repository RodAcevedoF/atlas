import assert from "node:assert/strict";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import {
  INQUIRY_JOB_GROUP,
  INQUIRY_JOB_STREAM,
  RedisInquiryJobPublisher,
  RedisInquiryJobQueue,
} from "@atlas/infra/inquiry-job-queue-redis";
import { createWatchedRedisClient } from "@atlas/infra/redis-client";
import { MongoInquiryRunStore, createMongoClient } from "@atlas/infra/store-mongodb";
import { inquiryRun } from "../../../packages/application/src/testing/inquiry-run.builder.ts";
import { startInquiryFixture } from "./testing/inquiry-proof-fixture.ts";

const root = new URL("../../../", import.meta.url).pathname;
const mongo = createMongoClient("mongodb://127.0.0.1:17017");
await mongo.connect();
const store = new MongoInquiryRunStore(mongo.db("atlas_p7"));
const redis = createWatchedRedisClient("redis://127.0.0.1:16379", { name: "proof" });
const publisher = new RedisInquiryJobPublisher(redis);
const fixture = startInquiryFixture();
const children: ReturnType<typeof Bun.spawn>[] = [];
const prefix = crypto.randomUUID();

function child(script: string, name: string, args: string[] = []) {
  const process = Bun.spawn(["bun", script, ...args], {
    cwd: root,
    env: {
      PATH: Bun.env.PATH,
      MONGODB_URI: "mongodb://127.0.0.1:17017",
      MONGODB_DB_NAME: "atlas_p7",
      REDIS_URL: "redis://127.0.0.1:16379",
      INTELLIGENCE_URL: `http://127.0.0.1:18899/${name}`,
      INQUIRY_WORKER_NAME: name,
      INQUIRY_QUEUE_BLOCK_MS: "100",
      INQUIRY_OWNERSHIP_REFRESH_MS: "500",
      INQUIRY_RECONCILE_INTERVAL_MS: "500",
      INQUIRY_RUN_TIMEOUT_MS: "10000",
      INQUIRY_RETRY_AFTER_MS: "5000",
    },
    stdout: Bun.file(`/tmp/atlas-p7-${name}.log`),
    stderr: Bun.file(`/tmp/atlas-p7-${name}.err`),
  });
  children.push(process);
  return process;
}

async function until<T>(read: () => Promise<T>, accept: (value: T) => boolean, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await read();
    if (accept(value)) return value;
    await Bun.sleep(100);
  }
  throw new Error("proof condition timed out");
}

async function seed(name: string, question = "happy", publish = true) {
  const run = inquiryRun({
    id: makeInquiryRunId(`${prefix}-${name}`),
    ownerId: makeUserId(name),
    question,
    questionKey: `${prefix}-${name}`,
    createdAt: new Date(),
  });
  await store.saveInquiryRun(run);
  if (publish) await publisher.publish(run.id);
  return run;
}

async function terminal(id: ReturnType<typeof makeInquiryRunId>) {
  return until(
    () => store.findInquiryRunById(id),
    (run) => run !== null && ["succeeded", "failed_permanent"].includes(run.status),
  );
}

async function watch(port: number, run: Awaited<ReturnType<typeof seed>>) {
  assert(run.ownerId);
  const response = await fetch(`http://127.0.0.1:${port}/runs/${run.id}/events`, {
    headers: { "x-proof-owner": run.ownerId },
    signal: AbortSignal.timeout(45_000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => {
      return JSON.parse(line.slice(6)) as { status: string; progress: { revision: number } };
    });
}

async function docker(action: string) {
  const process = Bun.spawn(["docker", action, "atlas-p7-redis"], {
    stdout: "ignore",
    stderr: "inherit",
  });
  assert.equal(await process.exited, 0);
}

async function proveReclaimScan() {
  const queue = new RedisInquiryJobQueue(redis, redis, {
    consumerName: "proof-scan",
    blockMs: 100,
  });
  await queue.ensureGroup();
  await Promise.all(
    Array.from({ length: 105 }, (_value, index) =>
      publisher.publish(makeInquiryRunId(`${prefix}-scan-${index}`)),
    ),
  );
  const pending = await queue.reserve(105);
  try {
    assert.equal(pending.length, 105);
    const last = pending.at(-1);
    assert(last);
    await redis.xclaim(
      INQUIRY_JOB_STREAM,
      INQUIRY_JOB_GROUP,
      "proof-scan",
      0,
      last.deliveryId,
      "IDLE",
      60_000,
    );
    let found = false;
    for (let pass = 0; pass < 12; pass += 1) {
      const reclaimed = await queue.reclaimStale(50_000, 1);
      found ||= reclaimed.some((job) => job.deliveryId === last.deliveryId);
    }
    assert(found, "reclamation never reached the abandoned entry beyond active pending jobs");
    console.log(
      JSON.stringify({ scenario: "reclaim-beyond-active-pending-prefix", result: "pass" }),
    );
  } finally {
    await Promise.all(pending.map((job) => queue.acknowledge(job.deliveryId)));
  }
}

try {
  await proveReclaimScan();
  const workers = new Map([
    ["worker-a", child("apps/worker/src/main.ts", "worker-a")],
    ["worker-b", child("apps/worker/src/main.ts", "worker-b")],
  ]);
  child("apps/api/scripts/testing/inquiry-proof-api.ts", "api-a", ["18081"]);
  child("apps/api/scripts/testing/inquiry-proof-api.ts", "api-b", ["18082"]);
  await Bun.sleep(2000);

  const runs = await Promise.all(
    Array.from({ length: 8 }, (_value, index) => seed(`user-${index}`)),
  );
  const watching = Promise.all(runs.flatMap((run) => [watch(18081, run), watch(18082, run)]));
  await Promise.all(runs.map((run) => publisher.publish(run.id)));
  const outcomes = await Promise.all(runs.map((run) => terminal(run.id)));
  const snapshots = await watching;
  assert(outcomes.every((run) => run?.status === "succeeded" && run.attempts === 1));
  assert(snapshots.every((values) => values.at(-1)?.status === "succeeded"));
  for (const values of snapshots) {
    assert(
      values.every(
        (value, index) =>
          index === 0 || value.progress.revision > (values[index - 1]?.progress.revision ?? -1),
      ),
    );
  }
  assert([...fixture.peaks.values()].every((peak) => peak === 1));
  const stranger = await fetch(`http://127.0.0.1:18081/runs/${runs[0]?.id}/events`, {
    headers: { "x-proof-owner": "stranger" },
  });
  assert.equal(stranger.status, 404);
  console.log(
    JSON.stringify({
      scenario: "two-workers-two-apis-eight-users-duplicate-delivery",
      result: "pass",
      peaks: Object.fromEntries(fixture.peaks),
    }),
  );

  const timedOut = await seed("timeout", "timeout");
  assert.equal((await terminal(timedOut.id))?.completion, "degraded");
  await Bun.sleep(200);
  assert(
    [...fixture.active.values()].every((active) => active === 0),
    "timed-out provider work remains active",
  );
  console.log(JSON.stringify({ scenario: "timeout-releases-provider-connection", result: "pass" }));

  const degraded = await seed("degraded", "disconnect-after-map");
  const degradedResult = await terminal(degraded.id);
  assert.equal(degradedResult?.completion, "degraded");
  assert.equal(degradedResult?.places.length, 1);
  const failed = await seed("failed", "disconnect-before-map");
  const failedResult = await terminal(failed.id);
  assert.equal(failedResult?.status, "failed_permanent");
  assert.equal(failedResult?.attempts, 2);
  await until(
    () => redis.xrange("inquiry:v1:jobs:dead", "-", "+"),
    (entries) => entries.some((entry) => entry[1].includes(failed.id)),
  );
  console.log(
    JSON.stringify({
      scenario: "intelligence-disconnect-and-retry-exhaustion",
      result: "pass",
      deadLetters: await redis.xlen("inquiry:v1:jobs:dead"),
    }),
  );

  const killed = await seed("killed", "kill");
  await until(
    () => store.findInquiryRunById(killed.id),
    (run) => run?.progress.stage === "map_ready",
  );
  const execution = fixture.executions.find((entry) => entry.runId === killed.id);
  assert(execution);
  const victim = workers.get(execution.worker);
  assert(victim);
  victim.kill("SIGKILL");
  await victim.exited;
  const recovered = await terminal(killed.id);
  assert.equal(recovered?.status, "succeeded");
  assert.equal(recovered?.attempts, 2);
  assert.equal(recovered?.places.length, 1);
  console.log(JSON.stringify({ scenario: "worker-death-after-map", result: "pass" }));

  const live = await seed("redis-live", "redis-live");
  await until(
    () => store.findInquiryRunById(live.id),
    (run) => run?.progress.stage === "map_ready",
  );
  const reconnected = Promise.all([watch(18081, live), watch(18082, live)]);
  await Bun.sleep(100);
  await docker("stop");
  const stranded = await seed("redis-outage", "happy", false);
  await Bun.sleep(1000);
  await docker("start");
  const reconnectedSnapshots = await reconnected;
  assert(reconnectedSnapshots.every((values) => values.at(-1)?.status === "succeeded"));
  assert.equal((await terminal(stranded.id))?.status, "succeeded");
  const probe = await seed("redis-restored");
  assert.equal((await terminal(probe.id))?.status, "succeeded");
  await until(
    () => redis.xpending("inquiry:v1:jobs", "inquiry:v1:workers"),
    (pending) => Array.isArray(pending) && pending[0] === 0,
  );
  console.log(
    JSON.stringify({ scenario: "redis-restart-stranded-mongo-and-fresh-job", result: "pass" }),
  );
} finally {
  await Promise.all(
    children.map(async (process) => {
      if (process.exitCode === null) process.kill("SIGKILL");
      await process.exited;
    }),
  );
  await fixture.stop();
  redis.disconnect();
  await mongo.close();
}
