import { useState, useEffect, useCallback } from "react";
import { smartFetch } from "@/lib/utils/smart-fetch";

export interface RequestHistoryItem {
  id: string;
  status: string;
  statusCode: number;
  responseTimeMs: number;
  creditsCharged: number;
  requestSizeBytes: number | null;
  responseSizeBytes: number | null;
  ipAddress: string | null;
  createdAt: string;
  caller: string;
}

export function useModelRequestHistory(modelId: string) {
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!modelId) return;
    setIsLoading(true);
    try {
      const data = await smartFetch<RequestHistoryItem[]>(
        `/analytics/models/${modelId}/request-history`
      );
      setHistory(data || []);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching model request history:", err);
      setError(err instanceof Error ? err.message : "Failed to load request history");
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 0);
    // Poll every 10 seconds for live updates
    const interval = setInterval(fetchHistory, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchHistory]);

  return { history, isLoading, error, refresh: fetchHistory };
}
