import { smartFetch } from "@/lib/utils/smart-fetch";
import { OrgRole } from "@/types";

/** Full org member record returned by the organization members API. */
export interface OrgMember {
  userId: string;
  orgId?: string;
  email?: string;
  fullName?: string;
  role: OrgRole;
  joinedAt: string;
}

/** Organization entity as returned by the API. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  walletId: string | null;
  createdBy: string;
  createdAt: string;
}

/**
 * Fetches all members in an organization.
 *
 * @param orgId - UUID of the organization.
 * @returns Array of OrgMember records.
 * @throws {Error} If the request fails.
 */
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  return smartFetch<OrgMember[]>(`/organizations/${orgId}/members`);
}

/**
 * Invites a new member to the organization by email.
 *
 * @param orgId - UUID of the organization.
 * @param email - Email address of the user to invite.
 * @param role - Role to assign (MAINTAINER, CONTRIBUTOR, or VIEWER).
 * @returns The created OrgMember record.
 * @throws {Error} If the user is not found.
 */
export async function inviteOrgMember(
  orgId: string,
  email: string,
  role: OrgRole
): Promise<OrgMember> {
  return smartFetch<OrgMember>(`/organizations/${orgId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
}

/**
 * Removes a member from the organization.
 *
 * @param orgId - UUID of the organization.
 * @param userId - UUID of the user to remove.
 * @returns Confirmation message.
 * @throws {Error} If the request fails.
 */
export async function removeOrgMember(
  orgId: string,
  userId: string
): Promise<{ message: string }> {
  return smartFetch<{ message: string }>(
    `/organizations/${orgId}/members/${userId}`,
    { method: "DELETE" }
  );
}

/**
 * Updates a member's role within the organization.
 *
 * @param orgId - UUID of the organization.
 * @param userId - UUID of the user.
 * @param role - The new role to assign.
 * @returns The updated OrgMember record.
 * @throws {Error} If the request fails.
 */
export async function updateOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole
): Promise<OrgMember> {
  return smartFetch<OrgMember>(`/organizations/${orgId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}
