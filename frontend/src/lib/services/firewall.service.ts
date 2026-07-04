import { smartFetch } from "@/lib/utils/smart-fetch";
import { FirewallPolicy } from "@/types";

export interface FirewallPolicyUpdate {
  enforcementMode?: "MONITOR" | "ENFORCE";
  ipAllowlist?: string[] | null;
  ipDenylist?: string[] | null;
  blockOnRiskScoreThreshold?: number | null;
  blockOnInjection?: boolean;
}

export interface FirewallStatus {
  blocked: boolean;
  reason: string | null;
}

/**
 * Fetches the firewall policy for a model, or null if none has been configured.
 *
 * @param modelId - The model UUID.
 */
export async function getModelFirewallPolicy(
  modelId: string
): Promise<FirewallPolicy | null> {
  return smartFetch<FirewallPolicy | null>(`/firewall/models/${modelId}`, {
    cache: "no-store",
  });
}

/**
 * Creates or updates the firewall policy for a model.
 *
 * @param modelId - The model UUID.
 * @param updates - Partial policy fields to update.
 */
export async function updateModelFirewallPolicy(
  modelId: string,
  updates: FirewallPolicyUpdate
): Promise<FirewallPolicy> {
  return smartFetch<FirewallPolicy>(`/firewall/models/${modelId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Fetches whether a model is currently auto-blocked by the firewall, and why.
 *
 * @param modelId - The model UUID.
 */
export async function getModelFirewallStatus(
  modelId: string
): Promise<FirewallStatus> {
  return smartFetch<FirewallStatus>(`/firewall/models/${modelId}/status`, {
    cache: "no-store",
  });
}

/**
 * Manually lifts an active auto-block on a model.
 *
 * @param modelId - The model UUID.
 */
export async function unblockModelFirewall(
  modelId: string
): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/firewall/models/${modelId}/unblock`, {
    method: "POST",
  });
}
