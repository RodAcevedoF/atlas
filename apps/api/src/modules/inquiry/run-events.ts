import type { InquiryRunStream } from "@atlas/application";
import type { FastifyReply } from "fastify";
import { writeStreamFrame } from "./stream-frame.ts";

const HEARTBEAT_MS = 15_000;

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};

function frame(reply: FastifyReply, text: string): void {
  if (reply.raw.writableEnded || reply.raw.destroyed || reply.raw.writableNeedDrain) return;
  reply.raw.write(text);
}

function release(reply: FastifyReply, stream: InquiryRunStream): Promise<void> {
  return stream.close().catch((error: unknown) => {
    reply.log.error({ err: error }, "inquiry run stream subscription was not released");
  });
}

export async function writeInquiryRunStream(
  reply: FastifyReply,
  stream: InquiryRunStream,
  authorize: () => Promise<boolean>,
  heartbeatMs = HEARTBEAT_MS,
  authorizationTimeoutMs = 5_000,
): Promise<void> {
  const negotiated = reply.getHeaders();
  reply.hijack();
  for (const [name, value] of Object.entries(negotiated)) {
    if (value !== undefined) reply.raw.setHeader(name, value);
  }
  for (const [name, value] of Object.entries(SSE_HEADERS)) reply.raw.setHeader(name, value);
  reply.raw.writeHead(200);
  let closed = false;
  let releasing: Promise<void> | null = null;
  let heartbeat: ReturnType<typeof setTimeout> | undefined;
  const close = (): Promise<void> => {
    closed = true;
    clearTimeout(heartbeat);
    releasing ??= release(reply, stream);
    if (!reply.raw.writableEnded && !reply.raw.destroyed) reply.raw.end();
    return releasing;
  };
  const authorized = async (): Promise<boolean> => {
    if (closed) return false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const allowed = await Promise.race([
        authorize(),
        new Promise<boolean>((resolve) => {
          timeout = setTimeout(() => resolve(false), authorizationTimeoutMs);
        }),
      ]);
      if (allowed && !closed) return true;
    } catch (error) {
      reply.log.error({ err: error }, "inquiry stream reauthorization failed");
    } finally {
      clearTimeout(timeout);
    }
    await close();
    return false;
  };
  const beat = async (): Promise<void> => {
    if (!(await authorized())) return;
    frame(reply, ": heartbeat\n\n");
    heartbeat = setTimeout(() => void beat(), heartbeatMs);
  };
  heartbeat = setTimeout(() => void beat(), heartbeatMs);
  reply.raw.once("close", () => void close());

  try {
    for await (const snapshot of stream.snapshots) {
      if (!(await authorized())) break;
      await writeStreamFrame(reply.raw, `data: ${JSON.stringify(snapshot)}\n\n`);
    }
  } catch (error) {
    reply.log.error({ err: error }, "inquiry run stream ended before the run did");
  } finally {
    await close();
  }
}
