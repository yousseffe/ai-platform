import { smartFetch } from "@/lib/utils/smart-fetch";

export interface AdminProviderTier {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  monthlyPriceEgp: number | string;
  annualPriceEgp: number | string | null;
  platformCommissionPercent: number;
  providerSharePercent: number;
  maxModels: number | null;
  maxPublicModels: number | null;
  maxVersionsPerModel: number | null;
  maxLLMModels: number | null;
  maxVisionModels: number | null;
  maxNLPModels: number | null;
  maxTabularModels: number | null;
  maxDiffusionModels: number | null;
  maxAudioModels: number | null;
  maxEmbeddingModels: number | null;
  allowPrivateModels: boolean;
  allowCustomPricing: boolean;
  allowPriorityReview: boolean;
  allowOrgPublishing: boolean;
  allowDedicatedSupport: boolean;
  allowFeaturedPlacement: boolean;
  allowAdvancedAnalytics: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminProviderTierPayload = Omit<
  AdminProviderTier,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Lists all provider subscription plans configured by admin.
 */
export async function listAdminProviderPlans(): Promise<AdminProviderTier[]> {
  return smartFetch<AdminProviderTier[]>("/admin/provider/tiers");
}

/**
 * Creates a provider subscription plan.
 */
export async function createAdminProviderPlan(
  payload: AdminProviderTierPayload,
): Promise<AdminProviderTier> {
  return smartFetch<AdminProviderTier>("/admin/provider/tiers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Updates a provider subscription plan.
 */
export async function updateAdminProviderPlan(
  tierId: string,
  payload: AdminProviderTierPayload,
): Promise<AdminProviderTier> {
  return smartFetch<AdminProviderTier>(`/admin/provider/tiers/${tierId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Deletes an unused plan, or deactivates it when assigned to providers.
 */
export async function deleteAdminProviderPlan(
  tierId: string,
): Promise<{ deleted: boolean; tier?: AdminProviderTier }> {
  return smartFetch<{ deleted: boolean; tier?: AdminProviderTier }>(
    `/admin/provider/tiers/${tierId}`,
    { method: "DELETE" },
  );
}
