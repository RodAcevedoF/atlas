import { expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { writeStreamFrame } from "./stream-frame.ts";

test("a full client buffer pauses delivery until the client reads", async () => {
  const output = new PassThrough({ highWaterMark: 1 });
  let delivered = false;

  const writing = writeStreamFrame(output, "snapshot").then(() => {
    delivered = true;
  });
  await Bun.sleep(1);
  const deliveredBeforeRead = delivered;
  const received = output.read().toString();
  await writing;
  output.destroy();

  expect(deliveredBeforeRead).toBe(false);
  expect(received).toBe("snapshot");
  expect(delivered).toBe(true);
  expect(output.listenerCount("drain")).toBe(0);
});

test("a client that never reads is disconnected after the drain deadline", async () => {
  const output = new PassThrough({ highWaterMark: 1 });

  await expect(writeStreamFrame(output, "snapshot", 5)).rejects.toThrow("timeout");

  expect(output.destroyed).toBe(true);
  expect(output.listenerCount("drain")).toBe(0);
});

test("a disconnect releases a pending write immediately", async () => {
  const output = new PassThrough({ highWaterMark: 1 });
  const writing = writeStreamFrame(output, "snapshot");

  output.destroy();

  await expect(writing).rejects.toThrow("closed");
  expect(output.listenerCount("drain")).toBe(0);
});
