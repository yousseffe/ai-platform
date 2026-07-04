import { smartFetch } from "@/lib/utils/smart-fetch";
import {
  AdminProviderDetailsResponse,
  AdminProvidersListResponse,
} from "@/types";

/**
 * Query params accepted by the admin providers list endpoint.
 */
export interface AdminProvidersQuery {
  /** Free-text search string. */
  search?: string;
  /** Provider lifecycle status. */
  providerStatus?: string;
  /** Owner type filter. */
  ownerType?: string;
  /** Restrict to active paid subscriptions. */
  hasActiveSubscription?: boolean;
  /** Page number. */
  page?: number;
}

/**
 * Fetches the paginated admin providers table.
 *
 * @param query - Provider list filters.
 * @returns Paginated provider rows.
 */
export async function getAdminProviders(
  query: AdminProvidersQuery = {},
): Promise<AdminProvidersListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.providerStatus) params.set("providerStatus", query.providerStatus);
  if (query.ownerType) params.set("ownerType", query.ownerType);
  if (query.hasActiveSubscription) params.set("hasActiveSubscription", "true");
  if (query.page) params.set("page", String(query.page));

  return smartFetch<AdminProvidersListResponse>(
    `/admin/providers${params.size > 0 ? `?${params.toString()}` : ""}`,
  );
}

/**
 * Fetches the admin details payload for a single provider account.
 *
 * @param providerId - Provider account UUID.
 * @returns Provider details.
 */
export async function getAdminProviderDetails(
  providerId: string,
): Promise<AdminProviderDetailsResponse> {
  return smartFetch<AdminProviderDetailsResponse>(`/admin/providers/${providerId}`);
}
