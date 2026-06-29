/** A single Prometheus instant/range sample: `[unixSeconds, value]`. */
export type PromSample = [number, string];

/** One series in a Prometheus result. */
export interface PromSeries {
  metric: Record<string, string>;
  value?: PromSample;
  values?: PromSample[];
}

/** Parsed Prometheus query response (`data.result`). */
export interface PromResult {
  resultType: string;
  result: PromSeries[];
}

/**
 * Read-only Prometheus query client. Callers pass fully-formed PromQL strings
 * that are built server-side from a fixed, named template set — never raw,
 * user-supplied PromQL (see the observability tool layer).
 */
export class PrometheusClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Executes an instant query.
   *
   * @param query - PromQL expression.
   * @returns The parsed result.
   */
  async instant(query: string): Promise<PromResult> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/api/v1/query`);
    url.searchParams.set('query', query);
    return this.run(url);
  }

  /**
   * Executes a range query.
   *
   * @param query - PromQL expression.
   * @param startSec - Range start (unix seconds).
   * @param endSec - Range end (unix seconds).
   * @param stepSec - Resolution step in seconds.
   * @returns The parsed result.
   */
  async range(
    query: string,
    startSec: number,
    endSec: number,
    stepSec: number,
  ): Promise<PromResult> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/api/v1/query_range`);
    url.searchParams.set('query', query);
    url.searchParams.set('start', String(startSec));
    url.searchParams.set('end', String(endSec));
    url.searchParams.set('step', String(stepSec));
    return this.run(url);
  }

  /**
   * Issues the HTTP request and unwraps Prometheus's `{ status, data }` envelope.
   */
  private async run(url: URL): Promise<PromResult> {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Prometheus ${res.status}: ${res.statusText}`);
    }
    const body = (await res.json()) as {
      status: string;
      data?: PromResult;
      error?: string;
    };
    if (body.status !== 'success' || !body.data) {
      throw new Error(`Prometheus query failed: ${body.error ?? 'unknown'}`);
    }
    return body.data;
  }
}
