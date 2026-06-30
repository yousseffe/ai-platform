import type { AnomalyResult } from './anomaly.js';

/** Live instant metrics snapshot (mirrors the backend metrics endpoint). */
export interface MetricsSnapshot {
  cpuPercent?: number;
  ramMb?: number;
  latencyP50?: number;
  latencyP95?: number;
  requestRate?: number;
  errorRate?: number;
}

/** A frequency-ranked error log line. */
export interface ErrorLine {
  line: string;
  count: number;
}

/** Inputs to the deterministic incident summarizer. */
export interface SummaryInput {
  windowMinutes: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  anomaly: AnomalyResult;
  topErrors: ErrorLine[];
  metrics: MetricsSnapshot;
}

/**
 * Produces a deterministic, descriptive (non-generative) one-paragraph summary
 * of a model's recent behavior. The MCP server states *what is*; the external
 * agent reasons about *why* and *what to do*.
 *
 * @param input - The gathered facts.
 * @returns A plain-text summary string.
 */
export function summarizeIncident(input: SummaryInput): string {
  const errPct = (input.errorRate * 100).toFixed(1);
  const parts: string[] = [];

  parts.push(
    `In the last ${input.windowMinutes}m: ${input.requestCount} requests, ` +
      `${input.errorCount} errors (${errPct}%). ` +
      `Latency p50 ${Math.round(input.latencyP50Ms)}ms / p95 ${Math.round(
        input.latencyP95Ms,
      )}ms.`,
  );

  if (input.anomaly.anomalous && input.anomaly.spikes.length > 0) {
    const worst = input.anomaly.spikes.reduce((a, b) => (b.z > a.z ? b : a));
    parts.push(
      `Error spike detected at ${worst.minute} (${worst.value} errors, z=${worst.z}).`,
    );
  } else {
    parts.push('No error spikes detected.');
  }

  if (input.topErrors.length > 0) {
    const top = input.topErrors[0];
    if (top) {
      parts.push(`Top error log: "${truncate(top.line, 160)}" (${top.count}x).`);
    }
  }

  const m = input.metrics;
  if (m && (m.requestRate || m.errorRate || m.cpuPercent || m.ramMb)) {
    parts.push(
      `Live: req_rate ${fmt(m.requestRate)}/s, err_rate ${fmt(
        m.errorRate,
      )}/s, cpu ${fmt(m.cpuPercent)}%, ram ${fmt(m.ramMb)}MB.`,
    );
  }

  return parts.join(' ');
}

/** Formats a possibly-undefined number compactly. */
function fmt(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Truncates a string to `max` characters with an ellipsis. */
function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Ranks raw log lines by frequency, returning the top `limit` error-like lines.
 * Pure string heuristics — no model.
 *
 * @param lines - Raw log lines.
 * @param limit - Max ranked lines to return.
 * @returns Frequency-ranked error lines.
 */
export function rankErrorLines(lines: string[], limit = 10): ErrorLine[] {
  const errorRe = /error|exception|traceback|fail|fatal|\b5\d\d\b/i;
  const counts = new Map<string, number>();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || !errorRe.test(line)) continue;
    const key = line.slice(0, 200);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([line, count]) => ({ line, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
