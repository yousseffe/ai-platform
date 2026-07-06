import { useState, useEffect, useCallback } from "react";
import { smartFetch } from "@/lib/utils/smart-fetch";

export interface ModelMetrics {
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  totalCreditsCharged: number;
  cpuPercent: number;
  ramMb: number;
  latencyP50: number;
  latencyP95: number;
  requestRate: number;
  errorRate: number;
}

export function useModelMetrics(modelId: string) {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await smartFetch<ModelMetrics>(`/analytics/models/${modelId}/metrics`);
      setMetrics(data);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching model metrics:", err);
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    if (!modelId) return;

    const timer = setTimeout(() => {
      fetchMetrics();
    }, 0);
    const interval = setInterval(fetchMetrics, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [modelId, fetchMetrics]);

  return { metrics, isLoading, error, refresh: fetchMetrics };
}
