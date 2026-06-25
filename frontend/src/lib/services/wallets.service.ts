import { smartFetch } from "@/lib/utils/smart-fetch";
import { WalletType } from "@/types";

/**
 * Interface representing a wallet ledger transaction record.
 */
export interface Transaction {
  id: string;
  walletId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  stripeEventId: string | null;
  reference: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

/**
 * Paginated transactions response structure.
 */
export interface PaginatedTransactions {
  success: boolean;
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetches a paginated history list of transactions associated with the active workspace's wallet.
 *
 * @param workspaceId - The UUID of the active workspace context.
 * @param walletType - CONSUMER or PROVIDER wallet type.
 * @param page - Target page index selector (1-based).
 * @param limit - Count of items per page.
 * @returns A promise resolving to the paginated list of transaction ledger records.
 */
export async function getTransactions(
  workspaceId: string,
  walletType: WalletType,
  page = 1,
  limit = 20,
  filters?: {
    txType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
): Promise<PaginatedTransactions> {
  let url = `/wallets/transactions?type=${walletType}&page=${page}&limit=${limit}`;
  if (filters) {
    if (filters.txType) url += `&txType=${encodeURIComponent(filters.txType)}`;
    if (filters.status) url += `&status=${encodeURIComponent(filters.status)}`;
    if (filters.startDate) url += `&startDate=${encodeURIComponent(filters.startDate)}`;
    if (filters.endDate) url += `&endDate=${encodeURIComponent(filters.endDate)}`;
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
  }

  return smartFetch<PaginatedTransactions>(url, {
    headers: {
      "X-Workspace-Id": workspaceId,
    },
  });
}

/**
 * Fetches the global configuration for the credits-to-EGP conversion multiplier.
 *
 * @returns A promise resolving to the credits per EGP multiplier coefficient.
 */
export async function getCreditsPerEgp(): Promise<number> {
  const res = await smartFetch<{ credits_per_egp: number }>("/wallets/config/credits-per-egp");
  return res.credits_per_egp;
}

