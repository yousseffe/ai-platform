import { smartFetch } from "@/lib/utils/smart-fetch";
import { AdminDashboardOverview } from "@/types";

/**
 * Fetches the professional admin dashboard overview payload.
 *
 * @returns Overview KPIs and top-provider rows.
 */
export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  return smartFetch<AdminDashboardOverview>("/admin/dashboard/overview");
}
