import { useState, useEffect, useCallback } from "react";
import { smartFetch } from "@/lib/utils/smart-fetch";

export interface SystemAlert {
  id: string;
  alertName: string;
  severity: string;
  status: string;
  summary: string;
  labels: Record<string, string>;
  startsAt: string;
  endsAt: string | null;
  receivedAt: string;
}

export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await smartFetch<SystemAlert[]>("/analytics/admin/alerts");
      setAlerts(data || []);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching system alerts:", err);
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts();
    }, 0);
    const interval = setInterval(fetchAlerts, 13000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  return { alerts, isLoading, error, refresh: fetchAlerts };
}
