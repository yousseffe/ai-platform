"use client";

import { create } from "zustand";
import { OrgRole, OrgType, OrgAction } from "@/types";
import { smartFetch } from "@/lib/utils/smart-fetch";

/** Minimal org data loaded for the portal context. */
export interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  description: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
}

/** Base role-to-allowed-actions mapping defining the RBAC permission matrix. */
const BASE_ROLE_PERMISSIONS: Record<OrgRole, OrgAction[]> = {
  [OrgRole.OWNER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_MODELS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.CREATE_PROJECT,
    OrgAction.DELETE_PROJECT,
    OrgAction.MANAGE_API_KEYS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
    OrgAction.VIEW_BILLING,
    OrgAction.EDIT_SETTINGS,
    OrgAction.UPLOAD_MODEL,
    OrgAction.DEPLOY_MODEL,
  ],
  [OrgRole.MAINTAINER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_MODELS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.CREATE_PROJECT,
    OrgAction.DELETE_PROJECT,
    OrgAction.MANAGE_API_KEYS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
    OrgAction.UPLOAD_MODEL,
    OrgAction.DEPLOY_MODEL,
  ],
  [OrgRole.CONTRIBUTOR]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_MODELS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
    OrgAction.UPLOAD_MODEL,
  ],
  [OrgRole.VIEWER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_MODELS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
  ],
};

const PROVIDER_ROLE_PERMISSIONS: Record<OrgRole, OrgAction[]> = {
  [OrgRole.OWNER]: [
    OrgAction.VIEW_MODELS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.VIEW_BILLING,
    OrgAction.EDIT_SETTINGS,
    OrgAction.UPLOAD_MODEL,
    OrgAction.DEPLOY_MODEL,
  ],
  [OrgRole.MAINTAINER]: [
    OrgAction.VIEW_MODELS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.UPLOAD_MODEL,
    OrgAction.DEPLOY_MODEL,
  ],
  [OrgRole.CONTRIBUTOR]: [OrgAction.VIEW_MODELS, OrgAction.UPLOAD_MODEL],
  [OrgRole.VIEWER]: [OrgAction.VIEW_MODELS],
};

const CONSUMER_ROLE_PERMISSIONS: Record<OrgRole, OrgAction[]> = {
  [OrgRole.OWNER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.CREATE_PROJECT,
    OrgAction.DELETE_PROJECT,
    OrgAction.MANAGE_API_KEYS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
    OrgAction.VIEW_BILLING,
    OrgAction.EDIT_SETTINGS,
  ],
  [OrgRole.MAINTAINER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.INVITE_MEMBERS,
    OrgAction.REMOVE_MEMBERS,
    OrgAction.CREATE_PROJECT,
    OrgAction.DELETE_PROJECT,
    OrgAction.MANAGE_API_KEYS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
  ],
  [OrgRole.CONTRIBUTOR]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_API_KEYS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
  ],
  [OrgRole.VIEWER]: [
    OrgAction.VIEW_PROJECTS,
    OrgAction.VIEW_PROJECT_USAGE,
    OrgAction.VIEW_USAGE,
  ],
};

function getPermissionMatrix(
  orgType?: OrgType | null,
): Record<OrgRole, OrgAction[]> {
  if (orgType === OrgType.PROVIDER) return PROVIDER_ROLE_PERMISSIONS;
  if (orgType === OrgType.CONSUMER) return CONSUMER_ROLE_PERMISSIONS;
  return BASE_ROLE_PERMISSIONS;
}

interface OrgContextState {
  org: OrgDetails | null;
  myRole: OrgRole | null;
  isLoading: boolean;
  error: string | null;
  /** Check if the current user can perform a given action in this org. */
  can: (action: OrgAction) => boolean;
  /** Fetch org details + current user's role from the backend. */
  loadOrg: (slug: string) => Promise<void>;
  /** Reset store state on navigation away from org portal. */
  reset: () => void;
}

/**
 * Zustand store providing RBAC-aware organization context for the org portal.
 * Exposes org metadata, the current user's role, and a `can()` helper
 * to gate UI features without repetitive role checks in each component.
 *
 * @example
 * const { org, can } = useOrgContext();
 * if (can(OrgAction.INVITE_MEMBERS)) { ... }
 */
export const useOrgContext = create<OrgContextState>((set, get) => ({
  org: null,
  myRole: null,
  isLoading: false,
  error: null,

  can: (action: OrgAction): boolean => {
    const { myRole, org } = get();
    if (!myRole) return false;
    return getPermissionMatrix(org?.type)[myRole]?.includes(action) ?? false;
  },

  loadOrg: async (slug: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const org = await smartFetch<OrgDetails>(`/organizations/slug/${slug}`);
      const membership = await smartFetch<{ role: OrgRole }>(
        `/organizations/${org.id}/my-role`,
      );
      set({ org, myRole: membership.role, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load organization";
      set({ isLoading: false, error: message, org: null, myRole: null });
    }
  },

  reset: () => set({ org: null, myRole: null, isLoading: false, error: null }),
}));
