import type {
  GraphEvent,
  GraphEventType,
  GraphRunInput,
  GraphStreamInput,
  InquiryRunEnvelope,
  OrchestrationPort,
} from "@atlas/application";
import {
  GraphUnavailableError,
  GraphUnreadableError,
  asRunEnvelope,
  isTerminalRunEnvelope,
} from "@atlas/application";

interface WireEvent {
  runId: string;
  node: string;
  type: GraphEventType;
  data?: unknown;
  timestamp: string;
}

export class HttpOrchestration implements OrchestrationPort {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(baseUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl;
  }

  async run(input: GraphRunInput): Promise<Record<string, unknown>> {
    const route = `POST /graphs/${input.graphName}/run`;
    const res = await this.postGraph(
      route,
      `${this.baseUrl}/graphs/${encodeURIComponent(input.graphName)}/run`,
      { "content-type": "application/json" },
      { input: input.input, runId: input.runId },
    );
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      throw new GraphUnreadableError(
        `${route} answered with an unreadable body: ${reasonOf(error)}`,
      );
    }
  }

  async *stream(input: GraphStreamInput): AsyncIterable<GraphEvent | InquiryRunEnvelope> {
    const route = `POST /graphs/${input.graphName}/stream`;
    const res = await this.postGraph(
      route,
      `${this.baseUrl}/graphs/${encodeURIComponent(input.graphName)}/stream`,
      { "content-type": "application/json", accept: "text/event-stream" },
      { input: input.input, runId: input.runId, attempt: input.attempt },
    );
    if (!res.body) {
      throw new GraphUnavailableError(`${route} returned no body`);
    }
    let lastSequence = 0;
    for await (const block of sseBlocks(res.body, route)) {
      const frame = parseSseBlock(block, route);
      if (frame === null) continue;
      if ("envelope" in frame) {
        if (frame.envelope.sequence <= lastSequence) {
          throw new GraphUnreadableError(
            `${route} regressed from sequence ${lastSequence} to ${frame.envelope.sequence}`,
          );
        }
        lastSequence = frame.envelope.sequence;
        yield frame.envelope;
        if (isTerminalRunEnvelope(frame.envelope)) return;
        continue;
      }
      yield frame.event;
      if (frame.event.type === "run:complete" || frame.event.type === "run:error") return;
    }
    throw new GraphUnavailableError(`${route} ended without a terminal event`);
  }

  private async postGraph(
    route: string,
    url: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new GraphUnavailableError(`${route} unreachable: ${reasonOf(error)}`);
    }
    if (res.status >= 500) {
      throw new GraphUnavailableError(`${route} ${res.status} ${res.statusText}`);
    }
    if (!res.ok) {
      throw new Error(`${route} ${res.status} ${res.statusText}`);
    }
    return res;
  }

  async resume(
    graphName: string,
    runId: string,
    resumeInput: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/graphs/${encodeURIComponent(graphName)}/resume/${encodeURIComponent(runId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: resumeInput }),
      },
    );
    if (!res.ok) {
      throw new Error(`POST /graphs/${graphName}/resume/${runId} ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Record<string, unknown>;
  }
}

async function* sseBlocks(body: ReadableStream<Uint8Array>, route: string): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let sourceFinished = false;
  try {
    while (true) {
      let chunk: Awaited<ReturnType<typeof reader.read>>;
      try {
        chunk = await reader.read();
      } catch (error) {
        sourceFinished = true;
        throw new GraphUnavailableError(`${route} dropped mid-stream: ${reasonOf(error)}`);
      }
      if (chunk.done) {
        sourceFinished = true;
        return;
      }
      buffered += decoder.decode(chunk.value, { stream: true });
      let separator = buffered.indexOf("\n\n");
      while (separator !== -1) {
        yield buffered.slice(0, separator);
        buffered = buffered.slice(separator + 2);
        separator = buffered.indexOf("\n\n");
      }
    }
  } finally {
    if (!sourceFinished) {
      await reader.cancel();
    }
  }
}

type StreamFrame = { envelope: InquiryRunEnvelope } | { event: GraphEvent };

function parseSseBlock(block: string, route: string): StreamFrame | null {
  let dataLine: string | null = null;
  for (const line of block.split("\n")) {
    if (line.startsWith("data:")) {
      dataLine = line.slice(5).trimStart();
    }
  }
  if (dataLine === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine);
  } catch (error) {
    throw new GraphUnreadableError(`${route} sent an unreadable frame: ${reasonOf(error)}`);
  }
  if (typeof parsed === "object" && parsed !== null && "schemaVersion" in parsed) {
    const envelope = asRunEnvelope(parsed);
    if (envelope === null) {
      throw new GraphUnreadableError(`${route} sent a malformed run envelope`);
    }
    return { envelope };
  }
  const wire = parsed as WireEvent;
  return {
    event: {
      runId: wire.runId,
      node: wire.node,
      type: wire.type,
      data: wire.data,
      timestamp: new Date(wire.timestamp),
    },
  };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
