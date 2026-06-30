/**
 * Thin HTTP client for the NestJS backend's `api/v1` surface. Forwards the
 * caller's bearer token on every request so the backend's existing guards
 * enforce per-user/org/model scope — the MCP server adds no privilege of its own.
 *
 * Read-only by convention: the MCP server never issues mutating requests.
 */
export class BackendClient {
  private readonly base: string;

  constructor(
    backendUrl: string,
    apiPrefix: string,
    private readonly bearer: string,
  ) {
    this.base = `${backendUrl.replace(/\/$/, '')}${apiPrefix}`;
  }

  /**
   * Performs a GET against the backend and returns the parsed JSON body.
   *
   * @typeParam T - Expected response shape.
   * @param path - Path under the API prefix (leading slash optional).
   * @param query - Optional query parameters.
   * @returns The parsed JSON response.
   * @throws {Error} If the backend responds with a non-2xx status.
   */
  async get<T = unknown>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(
      `${this.base}/${path.replace(/^\//, '')}`.replace(`${this.base}//`, `${this.base}/`),
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.bearer}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const detail = await safeErrorMessage(res);
      throw new Error(`Backend ${res.status} for ${path}: ${detail}`);
    }

    return (await res.json()) as T;
  }
}

/**
 * Best-effort extraction of a human-readable error message from a failed response.
 */
async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown; error?: unknown };
    return String(data.message ?? data.error ?? res.statusText);
  } catch {
    return res.statusText;
  }
}
