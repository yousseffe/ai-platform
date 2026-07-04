/**
 * Trend direction for admin KPI cards.
 */
export type AdminMetricTrend = "up" | "down" | "flat";

/**
 * Single KPI card rendered in the admin overview.
 */
export interface AdminMetricCard {
  /** Stable metric key. */
  key: string;
  /** Human-readable metric label. */
  label: string;
  /** Current value. */
  value: number;
  /** Previous period value. */
  previousValue: number;
  /** Percent change relative to previous value. */
  changePercent: number | null;
  /** Trend direction. */
  trend: AdminMetricTrend;
  /** Deep-link target. */
  href: string;
  /** Formatting hint for rendering. */
  format: "number" | "currency";
}

/**
 * Top provider row shown on the admin overview page.
 */
export interface AdminTopProvider {
  /** Provider account UUID. */
  id: string;
  /** Provider display name. */
  name: string;
  /** Total earnings in EGP. */
  totalEarnings: number;
  /** Total public models. */
  publicModels: number;
  /** Current provider tier. */
  tierName: string;
}

/**
 * Admin dashboard overview API response.
 */
export interface AdminDashboardOverview {
  /** Generation timestamp. */
  generatedAt: string;
  /** KPI cards. */
  cards: AdminMetricCard[];
  /** Top providers by earnings. */
  topProviders: AdminTopProvider[];
}

/**
 * Shared owner metadata used across provider admin pages.
 */
export interface AdminProviderOwnerSummary {
  /** Owner scope. */
  ownerType: "USER" | "ORG";
  /** Owner UUID. */
  ownerId: string;
  /** Owner display name. */
  ownerName: string;
  /** Contact email if available. */
  ownerEmail: string | null;
}

/**
 * Derived provider subscription snapshot.
 */
export interface AdminProviderSubscriptionSnapshot {
  /** Computed subscription state. */
  status: "FREE" | "ACTIVE" | "PENDING" | "SUSPENDED";
  /** Billing cadence if known. */
  billingCycle: "MONTHLY" | "ANNUAL" | null;
  /** Last confirmed payment date. */
  lastPaymentDate: string | null;
  /** Estimated renewal date. */
  nextRenewalDate: string | null;
  /** Last payment amount in EGP. */
  lastPaymentAmountEgp: number | null;
}

/**
 * Provider row in the admin providers table.
 */
export interface AdminProviderListItem {
  /** Provider account UUID. */
  id: string;
  /** Provider display name. */
  providerName: string;
  /** Owner metadata. */
  owner: AdminProviderOwnerSummary;
  /** Tier name. */
  currentTier: string;
  /** Provider lifecycle status. */
  providerStatus: string;
  /** Subscription snapshot. */
  subscription: AdminProviderSubscriptionSnapshot;
  /** Provider wallet balance in EGP. */
  walletBalanceEgp: number;
  /** Lifetime provider earnings in EGP. */
  totalEarningsEgp: number;
  /** Estimated commission generated in EGP. */
  platformCommissionEgp: number;
  /** Total models count. */
  totalModels: number;
  /** Public models count. */
  publicModels: number;
  /** LLM models count. */
  llmModels: number;
  /** Account creation timestamp. */
  createdAt: string;
}

/**
 * Shared pagination metadata for admin lists.
 */
export interface AdminPaginationMeta {
  /** Current page number. */
  page: number;
  /** Requested page size. */
  limit: number;
  /** Total matched rows. */
  total: number;
  /** Total pages count. */
  totalPages: number;
}

/**
 * Paginated provider list API response.
 */
export interface AdminProvidersListResponse {
  /** Current page rows. */
  data: AdminProviderListItem[];
  /** Pagination metadata. */
  meta: AdminPaginationMeta;
}

/**
 * Provider model summary on the details page.
 */
export interface AdminProviderModelSummary {
  /** Model UUID. */
  id: string;
  /** Model name. */
  name: string;
  /** Model type. */
  type: string;
  /** Visibility flag. */
  isPublic: boolean;
  /** Request count. */
  totalRequests: number;
  /** Revenue generated in EGP. */
  revenueGeneratedEgp: number;
  /** Latest observed usage timestamp. */
  lastUsedAt: string | null;
  /** Creation timestamp. */
  createdAt: string;
}

/**
 * Provider transaction or payment summary.
 */
export interface AdminProviderTransactionSummary {
  /** Transaction UUID. */
  id: string;
  /** Transaction direction/type. */
  type: string;
  /** Amount. */
  amount: number;
  /** Currency code. */
  currency: string;
  /** Ledger status. */
  status: string;
  /** Source reference. */
  source: string | null;
  /** Creation timestamp. */
  createdAt: string;
}

/**
 * Provider audit event row.
 */
export interface AdminAuditEventSummary {
  /** Audit event UUID. */
  id: string;
  /** Actor admin UUID. */
  actorAdminId: string;
  /** Action identifier. */
  action: string;
  /** Human-readable reason if present. */
  reason: string | null;
  /** Before snapshot. */
  before: Record<string, unknown> | null;
  /** After snapshot. */
  after: Record<string, unknown> | null;
  /** Event timestamp. */
  createdAt: string;
}

/**
 * Detailed provider API response.
 */
export interface AdminProviderDetailsResponse {
  /** Provider account UUID. */
  id: string;
  /** Provider display name. */
  providerName: string;
  /** Owner metadata. */
  owner: AdminProviderOwnerSummary;
  /** Tier name. */
  currentTier: string;
  /** Provider lifecycle status. */
  providerStatus: string;
  /** Subscription snapshot. */
  subscription: AdminProviderSubscriptionSnapshot;
  /** Wallet balance in EGP. */
  walletBalanceEgp: number;
  /** Lifetime provider earnings in EGP. */
  totalEarningsEgp: number;
  /** Estimated commission generated in EGP. */
  platformCommissionEgp: number;
  /** Subscription payments total in EGP. */
  subscriptionRevenueEgp: number;
  /** Inference requests count. */
  totalInferenceRequests: number;
  /** Last activity timestamp. */
  lastActiveAt: string | null;
  /** Account creation timestamp. */
  createdAt: string;
  /** Utilization map. */
  utilization: Record<
    string,
    { used: number; limit: number | null; remaining: number | null }
  >;
  /** Provider models. */
  models: AdminProviderModelSummary[];
  /** Recent transactions. */
  recentTransactions: AdminProviderTransactionSummary[];
  /** Recent audit events. */
  auditLog: AdminAuditEventSummary[];
  /** Internal lifecycle notes. */
  notes: string | null;
  /** Override notes. */
  customNotes: string | null;
}
