interface ErrorBody {
  error?: string;
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
}

export async function fetchNoContent(url: string, options?: RequestInit): Promise<void> {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) throw new Error(await readErrorMessage(response));
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status} ${response.statusText}`;
  if (!response.headers.get("content-type")?.includes("application/json")) return fallback;
  const body = (await response.json()) as ErrorBody;
  return body.error ?? fallback;
}
