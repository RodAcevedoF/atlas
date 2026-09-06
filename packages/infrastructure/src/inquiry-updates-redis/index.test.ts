import { describe, expect, test } from "bun:test";
import { makeInquiryRunId } from "@atlas/domain";
import type { Redis } from "ioredis";
import type { Logger } from "../logger/index.ts";
import { RedisInquiryRunNotifier, RedisInquiryRunSubscriptions } from "./index.ts";

const RUN_ID = makeInquiryRunId("run-1");
const OTHER_RUN_ID = makeInquiryRunId("run-2");

const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

interface Announcement {
  channel: string;
  payload: string;
}

function subscriberSeeing(announcements: Announcement[]): Redis {
  return {
    publish: (channel: string, payload: string) => {
      announcements.push({ channel, payload });
      return Promise.resolve(1);
    },
  } as unknown as Redis;
}

function refusing(reason: string): Redis {
  return {
    publish: () => Promise.reject(new Error(reason)),
  } as unknown as Redis;
}

describe("RedisInquiryRunNotifier", () => {
  test("an announcement lands on the run's own channel carrying the revision that is durable", async () => {
    const announcements: Announcement[] = [];
    const notifier = new RedisInquiryRunNotifier(subscriberSeeing(announcements), silentLogger);

    const delivered = await notifier.publish({ runId: RUN_ID, revision: 7 });

    expect(delivered).toBe(true);
    expect(announcements).toEqual([
      {
        channel: "inquiry:v1:updates:run-1",
        payload: JSON.stringify({ runId: "run-1", revision: 7 }),
      },
    ]);
  });

  test("a Redis that refuses the announcement is reported undelivered rather than failing the run", async () => {
    const notifier = new RedisInquiryRunNotifier(refusing("ECONNREFUSED"), silentLogger);

    const delivered = await notifier.publish({ runId: RUN_ID, revision: 7 });

    expect(delivered).toBe(false);
  });
});

interface FakeSubscriberRedis {
  redis: Redis;
  deliver(channel: string): void;
  reconnect(): void;
  channels(): string[];
  refuseSubscribe(reason: string | null): void;
}

function fakeSubscriberRedis(): FakeSubscriberRedis {
  const subscribed = new Set<string>();
  const handlers = new Map<string, ((...args: string[]) => void)[]>();
  let refusal: string | null = null;
  const redis = {
    on(event: string, handler: (...args: string[]) => void) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return redis;
    },
    subscribe: (...channels: string[]) => {
      if (refusal) return Promise.reject(new Error(refusal));
      for (const channel of channels) subscribed.add(channel);
      return Promise.resolve(subscribed.size);
    },
    unsubscribe: (...channels: string[]) => {
      for (const channel of channels) subscribed.delete(channel);
      return Promise.resolve(subscribed.size);
    },
  };
  const emit = (event: string, ...args: string[]) => {
    for (const handler of handlers.get(event) ?? []) handler(...args);
  };
  return {
    redis: redis as unknown as Redis,
    deliver(channel) {
      if (subscribed.has(channel)) emit("message", channel, "{}");
    },
    reconnect: () => emit("ready"),
    channels: () => [...subscribed],
    refuseSubscribe: (reason) => {
      refusal = reason;
    },
  };
}

describe("RedisInquiryRunSubscriptions", () => {
  test("an update published for one run wakes that run's reader and leaves the others asleep", async () => {
    const connection = fakeSubscriberRedis();
    const subscriptions = new RedisInquiryRunSubscriptions(connection.redis, silentLogger);
    const woken: string[] = [];
    await subscriptions.subscribe(RUN_ID, () => woken.push("run-1"));
    await subscriptions.subscribe(OTHER_RUN_ID, () => woken.push("run-2"));

    connection.deliver("inquiry:v1:updates:run-1");

    expect(woken).toEqual(["run-1"]);
  });

  test("a run keeps its subscription until the last reader of it has gone", async () => {
    const connection = fakeSubscriberRedis();
    const subscriptions = new RedisInquiryRunSubscriptions(connection.redis, silentLogger);
    const first = await subscriptions.subscribe(RUN_ID, () => {});
    const second = await subscriptions.subscribe(RUN_ID, () => {});

    await first.close();
    const whileSecondReads = connection.channels();
    await second.close();

    expect(whileSecondReads).toEqual(["inquiry:v1:updates:run-1"]);
    expect(connection.channels()).toEqual([]);
  });

  test("a run whose subscribe Redis refused is not carried into the next reconnect", async () => {
    const connection = fakeSubscriberRedis();
    const subscriptions = new RedisInquiryRunSubscriptions(connection.redis, silentLogger);
    const woken: string[] = [];
    connection.refuseSubscribe("ECONNRESET");

    await expect(subscriptions.subscribe(RUN_ID, () => woken.push("run-1"))).rejects.toThrow(
      "ECONNRESET",
    );

    connection.refuseSubscribe(null);
    connection.reconnect();
    await Promise.resolve();
    expect(connection.channels()).toEqual([]);
    expect(woken).toEqual([]);
  });

  test("a reconnected subscriber tells every open run to reload, since the gap cannot be replayed", async () => {
    const connection = fakeSubscriberRedis();
    const subscriptions = new RedisInquiryRunSubscriptions(connection.redis, silentLogger);
    const reloaded: string[] = [];
    await subscriptions.subscribe(RUN_ID, () => reloaded.push("run-1"));
    await subscriptions.subscribe(OTHER_RUN_ID, () => reloaded.push("run-2"));

    connection.reconnect();
    await Promise.resolve();

    expect(reloaded.sort()).toEqual(["run-1", "run-2"]);
  });
});
