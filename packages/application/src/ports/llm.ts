export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMCompletion {
  content: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMPort {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMCompletion>;
  stream(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string>;
}
