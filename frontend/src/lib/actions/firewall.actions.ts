"use server";

import * as firewallService from "@/lib/services/firewall.service";
import { FirewallPolicy } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Retrieves the firewall policy for a model.
 *
 * @param modelId - The model UUID.
 * @returns A promise resolving to the policy, or null if unset or on failure.
 */
export async function getModelFirewallPolicy(
  modelId: string
): Promise<FirewallPolicy | null> {
  try {
    return await firewallService.getModelFirewallPolicy(modelId);
  } catch (error) {
    console.error(`getModelFirewallPolicy error for ${modelId}:`, error);
    return null;
  }
}

/**
 * Creates or updates the firewall policy for a model.
 *
 * @param modelId - The model UUID.
 * @param updates - Partial policy fields to update.
 * @returns A promise resolving to a discriminated union with the updated policy or an error.
 */
export async function updateModelFirewallPolicy(
  modelId: string,
  updates: firewallService.FirewallPolicyUpdate
): Promise<{ success: true; data: FirewallPolicy } | { success: false; error: string }> {
  try {
    const res = await firewallService.updateModelFirewallPolicy(modelId, updates);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update firewall policy";
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves whether a model is currently auto-blocked by the firewall.
 *
 * @param modelId - The model UUID.
 * @returns A promise resolving to the block status, or null on failure.
 */
export async function getModelFirewallStatus(
  modelId: string
): Promise<firewallService.FirewallStatus | null> {
  try {
    return await firewallService.getModelFirewallStatus(modelId);
  } catch (error) {
    console.error(`getModelFirewallStatus error for ${modelId}:`, error);
    return null;
  }
}

/**
 * Manually lifts an active auto-block on a model.
 *
 * @param modelId - The model UUID.
 * @returns A promise resolving to a discriminated union indicating success or failure.
 */
export async function unblockModelFirewall(
  modelId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await firewallService.unblockModelFirewall(modelId);
    revalidatePath(`/models/${modelId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to clear firewall block";
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves the recent firewall audit logs for a model.
 *
 * @param modelId - The model UUID.
 * @returns A promise resolving to the list of audit logs, or empty array on failure.
 */
export async function getModelFirewallLogs(
  modelId: string
): Promise<firewallService.FirewallAuditLog[]> {
  try {
    return await firewallService.getModelFirewallLogs(modelId);
  } catch (error) {
    console.error(`getModelFirewallLogs error for ${modelId}:`, error);
    return [];
  }
}
