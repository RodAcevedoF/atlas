import type { Writable } from "node:stream";

export async function writeStreamFrame(
  output: Writable,
  text: string,
  timeoutMs = 15_000,
): Promise<void> {
  if (output.destroyed || output.writableEnded) throw new Error("stream is closed");
  if (output.write(text)) return;

  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeout);
      output.off("drain", drained);
      output.off("close", closed);
      output.off("error", failed);
    };
    const drained = (): void => {
      cleanup();
      resolve();
    };
    const failed = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const closed = (): void => failed(new Error("stream closed before draining"));
    const timeout = setTimeout(() => {
      failed(new Error("stream client did not drain within the timeout"));
      output.destroy();
    }, timeoutMs);
    output.once("drain", drained);
    output.once("close", closed);
    output.once("error", failed);
  });
}
