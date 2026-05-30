import type {
  GraphEvent,
  GraphEventType,
  GraphRunInput,
  OrchestrationPort,
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
    const res = await this.fetchImpl(
      `${this.baseUrl}/graphs/${encodeURIComponent(input.graphName)}/run`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: input.input, runId: input.runId }),
      },
    );
    if (!res.ok) {
      throw new Error(
        `POST /graphs/${input.graphName}/run ${res.status} ${res.statusText}`,
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  async *stream(input: GraphRunInput): AsyncIterable<GraphEvent> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/graphs/${encodeURIComponent(input.graphName)}/stream`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify({ input: input.input, runId: input.runId }),
      },
    );
    if (!res.ok) {
      throw new Error(
        `POST /graphs/${input.graphName}/stream ${res.status} ${res.statusText}`,
      );
    }
    if (!res.body) {
      throw new Error(
        `POST /graphs/${input.graphName}/stream returned no body`,
      );
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const event = parseSseBlock(block);
        if (event) yield event;
      }
    }
    buf += decoder.decode();
    if (buf.length > 0) {
      const event = parseSseBlock(buf);
      if (event) yield event;
    }
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
      throw new Error(
        `POST /graphs/${graphName}/resume/${runId} ${res.status} ${res.statusText}`,
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }
}

function parseSseBlock(block: string): GraphEvent | null {
  let dataLine: string | null = null;
  for (const line of block.split("\n")) {
    if (line.startsWith("data:")) {
      dataLine = line.slice(5).trimStart();
    }
  }
  if (dataLine === null) return null;
  const parsed = JSON.parse(dataLine) as WireEvent;
  return {
    runId: parsed.runId,
    node: parsed.node,
    type: parsed.type,
    data: parsed.data,
    timestamp: new Date(parsed.timestamp),
  };
}
