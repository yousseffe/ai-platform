/** A single Loki log entry: `[unixNanoString, line]`. */
export type LokiEntry = [string, string];

/** One log stream in a Loki query result. */
export interface LokiStream {
  stream: Record<string, string>;
  values: LokiEntry[];
}

/** Parsed Loki `query_range` result. */
export interface LokiResult {
  resultType: string;
  result: LokiStream[];
}

/**
 * Read-only Loki query client. LogQL strings are built server-side from a fixed
 * template set; raw user-supplied LogQL is never executed.
 */
export class LokiClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Executes a `query_range` against Loki.
   *
   * @param logql - LogQL expression.
   * @param startNs - Range start (unix nanoseconds, as string).
   * @param endNs - Range end (unix nanoseconds, as string).
   * @param limit - Max entries to return.
   * @param direction - Result ordering.
   * @returns The parsed result.
   */
  async queryRange(
    logql: string,
    startNs: string,
    endNs: string,
    limit: number,
    direction: 'forward' | 'backward' = 'backward',
  ): Promise<LokiResult> {
    const url = new URL(
      `${this.baseUrl.replace(/\/$/, '')}/loki/api/v1/query_range`,
    );
    url.searchParams.set('query', logql);
    url.searchParams.set('start', startNs);
    url.searchParams.set('end', endNs);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('direction', direction);

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Loki ${res.status}: ${res.statusText}`);
    }
    const body = (await res.json()) as {
      status: string;
      data?: LokiResult;
    };
    if (body.status !== 'success' || !body.data) {
      throw new Error('Loki query failed');
    }
    return body.data;
  }
}
