export type AdminMetricFormat = 'number' | 'currency';

export type AdminMetricTrend = 'up' | 'down' | 'flat';

export interface AdminMetricCard {
  key: string;

  label: string;

  value: number;

  previousValue: number;

  changePercent: number | null;

  trend: AdminMetricTrend;

  href: string;

  format: AdminMetricFormat;
}

export interface AdminTopProvider {
  id: string;

  name: string;

  totalEarnings: number;

  publicModels: number;

  tierName: string;
}

export interface AdminDashboardOverview {
  generatedAt: string;

  cards: AdminMetricCard[];

  topProviders: AdminTopProvider[];
}

export interface AdminProviderOwnerSummary {
  ownerType: 'USER' | 'ORG';

  ownerId: string;

  ownerName: string;

  ownerEmail: string | null;
}

export interface AdminProviderSubscriptionSnapshot {
  status: 'FREE' | 'ACTIVE' | 'PENDING' | 'SUSPENDED';

  billingCycle: 'MONTHLY' | 'ANNUAL' | null;

  lastPaymentDate: string | null;

  nextRenewalDate: string | null;

  lastPaymentAmountEgp: number | null;
}

export interface AdminProviderListItem {
  id: string;

  providerName: string;

  owner: AdminProviderOwnerSummary;

  currentTier: string;

  providerStatus: string;

  subscription: AdminProviderSubscriptionSnapshot;

  walletBalanceEgp: number;

  totalEarningsEgp: number;

  platformCommissionEgp: number;

  totalModels: number;

  publicModels: number;

  llmModels: number;

  createdAt: string;
}

export interface AdminPaginationMeta {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface AdminProvidersListResponse {
  data: AdminProviderListItem[];

  meta: AdminPaginationMeta;
}

export interface AdminProviderModelSummary {
  id: string;

  name: string;

  type: string;

  isPublic: boolean;

  totalRequests: number;

  revenueGeneratedEgp: number;

  lastUsedAt: string | null;

  createdAt: string;
}

export interface AdminProviderTransactionSummary {
  id: string;

  type: string;

  amount: number;

  currency: string;

  status: string;

  source: string | null;

  createdAt: string;
}

export interface AdminAuditEventSummary {
  id: string;

  actorAdminId: string;

  action: string;

  reason: string | null;

  before: Record<string, unknown> | null;

  after: Record<string, unknown> | null;

  createdAt: string;
}

export interface AdminProviderDetailsResponse {
  id: string;

  providerName: string;

  owner: AdminProviderOwnerSummary;

  currentTier: string;

  providerStatus: string;

  subscription: AdminProviderSubscriptionSnapshot;

  walletBalanceEgp: number;

  totalEarningsEgp: number;

  platformCommissionEgp: number;

  subscriptionRevenueEgp: number;

  totalInferenceRequests: number;

  lastActiveAt: string | null;

  createdAt: string;

  utilization: Record<
    string,
    { used: number; limit: number | null; remaining: number | null }
  >;

  models: AdminProviderModelSummary[];

  recentTransactions: AdminProviderTransactionSummary[];

  auditLog: AdminAuditEventSummary[];

  notes: string | null;

  customNotes: string | null;
}
