import { SUCCESS_BODY } from "../../../../packages/application/src/testing/inquiry-run.builder.ts";

export function startInquiryFixture() {
  const executions: { runId: string; worker: string; attempt: number }[] = [];
  const active = new Map<string, number>();
  const peaks = new Map<string, number>();
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 18899,
    async fetch(request) {
      const worker = new URL(request.url).pathname.split("/")[1] ?? "unknown";
      const body = (await request.json()) as {
        runId: string;
        attempt: number;
        input: { question: string };
      };
      executions.push({ runId: body.runId, worker, attempt: body.attempt });
      active.set(worker, (active.get(worker) ?? 0) + 1);
      peaks.set(worker, Math.max(peaks.get(worker) ?? 0, active.get(worker) ?? 0));
      let cancelled = false;
      let released = false;
      let finishDelay = (): void => {};
      const release = () => {
        if (released) return;
        released = true;
        active.set(worker, (active.get(worker) ?? 1) - 1);
      };
      const cancel = () => {
        cancelled = true;
        finishDelay();
        release();
      };
      request.signal.addEventListener("abort", cancel, { once: true });
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let sequence = 0;
          const emit = (type: string, data: Record<string, unknown>) => {
            if (cancelled) return;
            sequence += 1;
            const frame = {
              schemaVersion: 1,
              runId: body.runId,
              attempt: body.attempt,
              sequence,
              type,
              occurredAt: new Date().toISOString(),
              durationMs: 1,
              data,
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`));
          };
          try {
            if (body.input.question === "disconnect-before-map") return;
            emit("retrieval_complete", SUCCESS_BODY);
            emit("map_ready", SUCCESS_BODY);
            if (body.input.question === "disconnect-after-map") return;
            const slow =
              body.input.question === "timeout" ||
              (body.input.question === "kill" && body.attempt === 1);
            await new Promise<void>((resolve) => {
              const delay = body.input.question === "redis-live" ? 3000 : 500;
              const timer = setTimeout(resolve, slow ? 60_000 : delay);
              finishDelay = () => {
                clearTimeout(timer);
                resolve();
              };
            });
            emit("synthesis_ready", { synthesis: SUCCESS_BODY.synthesis });
            emit("run_complete", { result: SUCCESS_BODY });
          } finally {
            release();
            request.signal.removeEventListener("abort", cancel);
            if (!cancelled) controller.close();
          }
        },
        cancel,
      });
      return new Response(stream, { headers: { "content-type": "text/event-stream" } });
    },
  });
  return { executions, peaks, active, stop: () => server.stop(true) };
}
