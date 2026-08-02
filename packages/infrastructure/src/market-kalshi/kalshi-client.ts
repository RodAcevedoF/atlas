
const BASE_URL = "https://api.elections.kalshi.com/trade-api/v2";

function buildKalshiUrl(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): URL {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

export async function fetchKalshiJson<T>(options: {
  path: string;
  searchParams?: Record<string, string | number | undefined>;
  allow404?: boolean;
  errorLabel: string;
}): Promise<T | null> {
  const res = await fetch(buildKalshiUrl(options.path, options.searchParams));
  if (options.allow404 && res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${options.errorLabel} ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
