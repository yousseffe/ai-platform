import { smartFetch } from "@/lib/utils/smart-fetch";
import { WalletType } from "@/types";

/**
 * Lightweight wallet balance shape returned by workspace finance endpoints.
 */
export interface WorkspaceWallet {
  id: string;
  balance: number;
  currency: string;
  walletType: WalletType;
}

interface WorkspaceWalletApiResponse {
  id: string;
  balance: number | string;
  currency: string;
  walletType: WalletType;
}

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
 * Normalizes wallet payloads coming from decimal-backed database responses.
 *
 * @param wallet - Raw wallet payload returned by the backend.
 * @returns Wallet object with a guaranteed numeric balance.
 */
function normalizeWorkspaceWallet(
  wallet: WorkspaceWalletApiResponse,
): WorkspaceWallet {
  return {
    ...wallet,
    balance:
      typeof wallet.balance === "string"
        ? parseFloat(wallet.balance)
        : wallet.balance,
  };
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
 * Retrieves every wallet ledger associated with an organization workspace.
 *
 * @param orgId - Organization UUID.
 * @returns A promise resolving to the organization wallets collection.
 */
export async function getOrganizationWallets(
  orgId: string,
): Promise<WorkspaceWallet[]> {
  const wallets = await smartFetch<WorkspaceWalletApiResponse[]>(
    `/wallets/org/${orgId}`,
    {
      headers: {
        "X-Workspace-Id": orgId,
      },
    },
  );

  return wallets.map(normalizeWorkspaceWallet);
}

/**
 * Withdraws funds from the active provider wallet of a workspace.
 *
 * @param workspaceId - Active workspace UUID.
 * @param amount - Amount in EGP to withdraw.
 * @returns A promise resolving to the updated wallet ledger.
 */
export async function withdrawWorkspaceFunds(
  workspaceId: string,
  amount: number,
): Promise<WorkspaceWallet> {
  const wallet = await smartFetch<WorkspaceWalletApiResponse>("/wallets/withdraw", {
    method: "POST",
    headers: {
      "X-Workspace-Id": workspaceId,
    },
    body: JSON.stringify({ amount }),
  });

  return normalizeWorkspaceWallet(wallet);
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

export interface WalletAnalytics {
  dailyTransactions: { date: string; credits: number; debits: number }[];
  apiKeysUsage: {
    id: string;
    name: string;
    keyPrefix: string;
    modelName: string;
    maxDailySpendCredits: number | null;
    todaySpend: number;
    maxRequestsPerMinute: number | null;
  }[];
}

export async function getWalletAnalytics(
  workspaceId: string,
  walletType: WalletType
): Promise<WalletAnalytics> {
  return smartFetch<WalletAnalytics>(`/wallets/analytics?type=${walletType}`, {
    headers: {
      "X-Workspace-Id": workspaceId,
    },
    cache: "no-store",
  });
}
