import type { InquiryRunStream } from "@atlas/application";
import type { FastifyReply } from "fastify";

const HEARTBEAT_MS = 15_000;

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};

function frame(reply: FastifyReply, text: string): void {
  if (reply.raw.writableEnded) return;
  reply.raw.write(text);
}

function release(reply: FastifyReply, stream: InquiryRunStream): Promise<void> {
  return stream.close().catch((error: unknown) => {
    reply.log.error({ err: error }, "inquiry run stream subscription was not released");
  });
}

/** hijacking skips the reply's own send, so the headers CORS and helmet negotiated are carried over by hand */
export async function writeInquiryRunStream(
  reply: FastifyReply,
  stream: InquiryRunStream,
): Promise<void> {
  const negotiated = reply.getHeaders();
  reply.hijack();
  for (const [name, value] of Object.entries(negotiated)) {
    if (value !== undefined) reply.raw.setHeader(name, value);
  }
  for (const [name, value] of Object.entries(SSE_HEADERS)) reply.raw.setHeader(name, value);
  reply.raw.writeHead(200);
  const heartbeat = setInterval(() => frame(reply, ": heartbeat\n\n"), HEARTBEAT_MS);
  reply.raw.on("close", () => {
    void release(reply, stream);
  });

  try {
    for await (const snapshot of stream.snapshots) {
      frame(reply, `data: ${JSON.stringify(snapshot)}\n\n`);
    }
  } catch (error) {
    reply.log.error({ err: error }, "inquiry run stream ended before the run did");
  } finally {
    clearInterval(heartbeat);
    await release(reply, stream);
    if (!reply.raw.writableEnded) reply.raw.end();
  }
}
