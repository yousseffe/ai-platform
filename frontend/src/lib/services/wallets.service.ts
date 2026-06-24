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
  limit = 20
): Promise<PaginatedTransactions> {
  return smartFetch<PaginatedTransactions>(
    `/wallets/transactions?type=${walletType}&page=${page}&limit=${limit}`,
    {
      headers: {
        "X-Workspace-Id": workspaceId,
      },
    }
  );
}
