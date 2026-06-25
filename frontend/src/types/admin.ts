/**
 * Represents a model registration entry with container metrics inside the admin dashboard.
 */
export interface AdminModel {
  /** Unique model UUID */
  id: string;
  /** Name of the ML model */
  name: string;
  /** Description details */
  description: string;
  /** Service tier level */
  tier: string;
  /** Prediction request credit cost */
  costPerRequest: number;
  /** Percentage split allocated to model owner provider */
  providerSharePercent: number;
  /** Running status of model container (ACTIVE/INACTIVE) */
  status: string;
  /** Host port mapping assigned for prediction requests */
  port: number | null;
  /** Live CPU utilization percentage */
  cpu: string;
  /** Live RAM memory usage metric */
  ram: string;
  /** Owner user email address */
  owner: string;
  /** Marketplace visibility */
  isPublic: boolean;
}

/**
 * Represents a single financial ledger transaction record on the platform.
 */
export interface PlatformTransaction {
  /** Unique transaction UUID */
  id: string;
  /** Wallet ID this transaction maps to */
  walletId: string;
  /** Transaction type (CREDIT or DEBIT) */
  type: "CREDIT" | "DEBIT";
  /** Value credits amount */
  amount: string | number;
  /** Ledger logs summary reference description */
  reference: string;
  /** Completion status of ledger payment */
  status: string;
  /** Creation timestamp string */
  createdAt: string;
}

/**
 * Aggregated statistics and transaction ledgers payload returned for admin analytics.
 */
export interface PlatformStats {
  /** Cumulative count of registered platform users */
  totalUsers: number;
  /** Cumulative count of catalog registered models */
  totalModels: number;
  /** Cumulative count of initialized organization workspaces */
  totalOrgs: number;
  /** Current credits balance in system commission wallet */
  platformBalance: number;
  /** List of recent platform ledger logs */
  recentTransactions: PlatformTransaction[];
}
