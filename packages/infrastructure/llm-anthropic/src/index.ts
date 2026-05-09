import type { LLMCompletion, LLMMessage, LLMOptions, LLMPort } from "@atlas/application";
import { NotImplementedError } from "@atlas/shared";

export class AnthropicLLMAdapter implements LLMPort {
  async complete(_messages: LLMMessage[], _options?: LLMOptions): Promise<LLMCompletion> {
    throw new NotImplementedError("AnthropicLLMAdapter.complete");
  }

  async *stream(_messages: LLMMessage[], _options?: LLMOptions): AsyncIterable<string> {
    throw new NotImplementedError("AnthropicLLMAdapter.stream");
  }
}
