import { fetchWithRetry } from "@atlas/shared";
import type { ExaSearchRequest, ExaSearchResponse } from "./exa-types.ts";

const SEARCH_URL = "https://api.exa.ai/search";

const RETRY_OPTIONS = { maxRetries: 5, baseDelayMs: 1_000, maxDelayMs: 30_000 };

const REQUEST_BUDGET_MS = 15_000;

export async function fetchExaSearch(
  apiKey: string,
  request: ExaSearchRequest,
): Promise<ExaSearchResponse> {
  const response = await fetchWithRetry(
    SEARCH_URL,
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(REQUEST_BUDGET_MS),
    },
    RETRY_OPTIONS,
  );
  if (!response.ok) {
    throw new Error(`Exa search ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ExaSearchResponse;
}
