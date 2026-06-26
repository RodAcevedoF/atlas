import type { GdeltDocResponse } from "./gdelt-types.ts";

const BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

function buildDocUrl(searchParams: Record<string, string | number | undefined>): URL {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}


export async function fetchGdeltDoc(
  searchParams: Record<string, string | number | undefined>,
): Promise<GdeltDocResponse> {
  const response = await fetch(buildDocUrl(searchParams));
  if (!response.ok) {
    throw new Error(`GDELT DOC ${response.status} ${response.statusText}`);
  }

  const body = (await response.text()).trim();
  if (!body) return { articles: [] };
  if (!body.startsWith("{")) {
    throw new Error(`GDELT DOC returned a non-JSON response: ${body.slice(0, 200)}`);
  }
  return JSON.parse(body) as GdeltDocResponse;
}
