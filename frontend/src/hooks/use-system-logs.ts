import { useState, useEffect, useCallback } from "react";
import { smartFetch } from "@/lib/utils/smart-fetch";

export interface SystemLog {
  timestamp: string;
  line: string;
  stream: Record<string, string>;
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    service: "",
    level: "",
    limit: "150",
  });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.service) queryParams.set("service", filters.service);
      if (filters.level) queryParams.set("level", filters.level);
      queryParams.set("limit", filters.limit);

      const res = await smartFetch<{ logs: SystemLog[] }>(
        `/analytics/admin/logs?${queryParams.toString()}`
      );
      setLogs(res.logs || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching system logs:", err);
      setError(err.message || "Failed to load system logs");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, isLoading, error, filters, setFilters, refresh: fetchLogs };
}
