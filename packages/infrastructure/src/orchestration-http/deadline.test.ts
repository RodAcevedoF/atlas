import { expect, test } from "bun:test";
import { GraphUnavailableError, GraphUnreadableError } from "@atlas/application";
import { HttpOrchestration } from "./index.ts";

for (const stalled of ["headers", "body"] as const) {
  test(`a graph request deadline interrupts stalled ${stalled}`, async () => {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch() {
        if (stalled === "headers") {
          await Bun.sleep(200);
          return new Response("{}");
        }
        let timer: ReturnType<typeof setTimeout>;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("{"));
              timer = setTimeout(() => {
                controller.enqueue(new TextEncoder().encode("}"));
                controller.close();
              }, 200);
            },
            cancel() {
              clearTimeout(timer);
            },
          }),
        );
      },
    });
    try {
      const orchestration = new HttpOrchestration(server.url.toString());

      const result = orchestration.run({
        graphName: "deadline-test",
        input: {},
        signal: AbortSignal.timeout(50),
      });

      await expect(result).rejects.toBeInstanceOf(
        stalled === "headers" ? GraphUnavailableError : GraphUnreadableError,
      );
      await expect(result).rejects.toThrow(/timed out|aborted/i);
    } finally {
      await server.stop(true);
    }
  });
}
