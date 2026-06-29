/** A per-minute traffic bucket (mirrors the backend RequestStats shape). */
export interface MinuteBucket {
  minute: string;
  count: number;
  errors: number;
}

/** A single anomalous data point. */
export interface SpikePoint {
  minute: string;
  value: number;
  z: number;
}

/** Result of a deterministic z-score spike scan over a series. */
export interface AnomalyResult {
  anomalous: boolean;
  mean: number;
  std: number;
  threshold: number;
  spikes: SpikePoint[];
}

/**
 * Computes the population mean and standard deviation of a numeric series.
 *
 * @param values - Numeric samples.
 * @returns `{ mean, std }` (std is 0 for fewer than 2 points).
 */
export function meanStd(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (values.length < 2) return { mean, std: 0 };
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Exponentially weighted moving average of a series.
 *
 * @param values - Numeric samples in time order.
 * @param alpha - Smoothing factor in (0, 1]; higher reacts faster.
 * @returns The EWMA series (same length as input).
 */
export function ewma(values: number[], alpha = 0.5): number[] {
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (const v of values) {
    prev = alpha * v + (1 - alpha) * prev;
    out.push(prev);
  }
  return out;
}

/**
 * Detects error-count spikes across per-minute buckets using a leave-one-out
 * z-score test with a minimum-count floor. Deterministic: no model, no inference.
 *
 * Each candidate point is scored against the mean/std of the *other* points so a
 * single dominant outlier cannot inflate its own baseline (which defeats a naive
 * z-score on small samples). A point must also clear `minErrors` to be flagged,
 * so one stray error among zeros is not reported as a spike.
 *
 * @param perMinute - Per-minute buckets.
 * @param threshold - Z-score at/above which a point is flagged (default 2).
 * @param minErrors - Minimum absolute error count to consider (default 3).
 * @returns An {@link AnomalyResult}.
 */
export function detectErrorSpikes(
  perMinute: MinuteBucket[],
  threshold = 2,
  minErrors = 3,
): AnomalyResult {
  const series = perMinute.map((b) => b.errors);
  const overall = meanStd(series);
  const spikes: SpikePoint[] = [];

  perMinute.forEach((bucket, i) => {
    if (bucket.errors < minErrors) return;
    const others = series.filter((_, j) => j !== i);
    const { mean, std } = meanStd(others);

    let z: number;
    if (std === 0) {
      // Baseline is flat; flag only if the point exceeds that flat baseline.
      z = bucket.errors > mean ? Infinity : 0;
    } else {
      z = (bucket.errors - mean) / std;
    }

    if (z >= threshold) {
      spikes.push({
        minute: bucket.minute,
        value: bucket.errors,
        z: Number.isFinite(z) ? Number(z.toFixed(2)) : 999,
      });
    }
  });

  return {
    anomalous: spikes.length > 0,
    mean: Number(overall.mean.toFixed(3)),
    std: Number(overall.std.toFixed(3)),
    threshold,
    spikes,
  };
}
