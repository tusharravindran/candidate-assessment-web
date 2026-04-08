const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: token } : {}),
    ...((init.headers as Record<string, string>) ?? {})
  };
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    return res;
  } catch {
    throw new ApiError(
      "Cannot reach the server. It may be starting up — please wait a moment and try again.",
      0
    );
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await apiFetch(path, init, token);
  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(
      data?.message || data?.error || `Request failed (${res.status})`,
      res.status
    );
  }
  return data as T;
}
