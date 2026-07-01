import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { getTransactions, Transaction } from "@/lib/services/wallets.service";

/**
 * Custom hook managing loading states, current page offsets, and data fetch
 * execution paths for the active workspace's transaction history records.
 * Optimized to comply with strict React linter rendering rules.
 *
 * @param limit - Count of items per page (default 10).
 * @returns State properties and handler methods for transactions history management.
 */
export function useTransactions(limit = 10, enabled = true) {
  const { activeWorkspace, viewMode } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Render-time state reset to synchronize page parameter on context switches
  const [prevWorkspaceId, setPrevWorkspaceId] = useState<string | undefined>(activeWorkspace?.id);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);

  if (activeWorkspace?.id !== prevWorkspaceId || viewMode !== prevViewMode) {
    setPrevWorkspaceId(activeWorkspace?.id);
    setPrevViewMode(viewMode);
    setPage(1);
  }

  /**
   * Refetch trigger exposing manual cache updates for page controls.
   */
  const refetch = useCallback(async () => {
    if (!activeWorkspace || !enabled) return;
    setLoading(true);
    try {
      const res = await getTransactions(activeWorkspace.id, viewMode, page, limit, {
        search: search.trim() || undefined,
        txType: txType || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) {
        setTransactions(res.data);
        setTotal(res.total);
      }
    } catch (err) {
      console.error("Failed to load workspace transactions history:", err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, enabled, viewMode, page, limit, search, txType, status, startDate, endDate]);

  useEffect(() => {
    if (!activeWorkspace || !enabled) {
      setTransactions([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let active = true;

    // Asynchronously dispatch loading states to prevent synchronous effect cascade renders
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    getTransactions(activeWorkspace.id, viewMode, page, limit, {
      search: search.trim() || undefined,
      txType: txType || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then((res) => {
        if (active && res.success) {
          setTransactions(res.data);
          setTotal(res.total);
        }
      })
      .catch((err) => {
        console.error("Failed to load workspace transactions history:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeWorkspace, enabled, viewMode, page, limit, search, txType, status, startDate, endDate]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, txType, status, startDate, endDate]);

  return {
    transactions,
    total,
    page,
    setPage,
    loading,
    refetch,
    // Filters and Setters
    search,
    setSearch,
    txType,
    setTxType,
    status,
    setStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  };
}
