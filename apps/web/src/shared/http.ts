interface ErrorBody {
  error?: string;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requestOptions(options: RequestInit = {}): RequestInit {
  const headers = new Headers(options.headers);
  if (!SAFE_METHODS.has((options.method ?? "GET").toUpperCase())) {
    headers.set("X-Atlas-Request", "1");
  }
  return { credentials: "include", ...options, headers };
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, requestOptions(options));
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
}

export async function fetchNoContent(url: string, options?: RequestInit): Promise<void> {
  const response = await fetch(url, requestOptions(options));
  if (!response.ok) throw new Error(await readErrorMessage(response));
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status} ${response.statusText}`;
  if (!response.headers.get("content-type")?.includes("application/json")) return fallback;
  const body = (await response.json()) as ErrorBody;
  return body.error ?? fallback;
}

export async function fetchBlob(url: string, options?: RequestInit): Promise<Blob | null> {
  const response = await fetch(url, requestOptions(options));
  if (!response.ok) throw new Error(await readErrorMessage(response));
  if (response.status === 204) return null;
  return response.blob();
}
