import type { GraphEvent, GraphRunInput, OrchestrationPort } from "@atlas/application";
import { NotImplementedError } from "@atlas/shared";

export class LangGraphOrchestration implements OrchestrationPort {
  async run(_input: GraphRunInput): Promise<Record<string, unknown>> {
    throw new NotImplementedError("LangGraphOrchestration.run");
  }

  async *stream(_input: GraphRunInput): AsyncIterable<GraphEvent> {
    throw new NotImplementedError("LangGraphOrchestration.stream");
  }

  async resume(
    _runId: string,
    _resumeInput: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    throw new NotImplementedError("LangGraphOrchestration.resume");
  }
}
