import { create } from "zustand";
import { Session } from "next-auth";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { OwnerType, OrgRole, WalletType, OrgType } from "@/types";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: OwnerType;
  orgType?: OrgType;
  role: OrgRole;
}

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  viewMode: WalletType;
  balance: number;
  canAccessBilling: boolean;
  isLoading: boolean;
  isProviderModeEnabled: boolean;
  switchingWorkspace: Workspace | null;
  isOtpModalOpen: boolean;
  isAdmin: boolean;
  apiKey: string;
  setOtpModalOpen: (open: boolean) => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  switchToPersonalWorkspace: () => Promise<{ success: boolean; error?: string }>;
  setViewMode: (mode: WalletType) => void;
  createOrganization: (
    name: string,
    slug: string,
    collaborators?: Array<{ email: string; role: OrgRole }>,
    type?: OrgType,
    description?: string,
    avatarUrl?: string,
    bypassPayment?: boolean
  ) => Promise<{ success: boolean; data?: { url?: string }; error?: string }>;
  becomeProvider: () => Promise<{ success: boolean; error?: string }>;
  fetchWorkspaceDetails: (session: Session | null) => Promise<void>;
  refreshData: () => Promise<void>;
  triggerWorkspaceSwitch: (workspace: Workspace) => Promise<{ success: boolean; requiresOtp: boolean; error?: string }>;
  confirmWorkspaceSwitch: (code: string) => Promise<{ success: boolean; error?: string }>;
  rotateApiKey: () => Promise<{ success: boolean; error?: string }>;
  withdrawFunds: (amount: number) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Helper to set cookies in client-side code.
 */
function setCookie(name: string, value: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Strict`;
}

/**
 * Helper to get cookies in client-side code.
 */
function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Billing data is available for personal workspaces and organization owners only.
 */
function canAccessWorkspaceBilling(workspace: Workspace | null): boolean {
  if (!workspace) return false;
  return workspace.type === OwnerType.USER || workspace.role === OrgRole.OWNER;
}

/**
 * Personal workspace is the local developer context represented by owner type USER.
 */
function findPersonalWorkspace(workspaces: Workspace[]): Workspace | undefined {
  return workspaces.find((workspace) => workspace.type === OwnerType.USER);
}

/**
 * Zustand store to manage multi-tenant workspaces, active view mode,
 * credit ledgers, organization switcher OTP security verification, and provider status.
 */
export const useWorkspace = create<WorkspaceState>((set, get) => ({
  activeWorkspace: null,
  workspaces: [],
  viewMode: WalletType.CONSUMER,
  balance: 0.00,
  canAccessBilling: true,
  isLoading: true,
  isProviderModeEnabled: false,
  switchingWorkspace: null,
  isOtpModalOpen: false,
  isAdmin: false,
  apiKey: "",

  setOtpModalOpen: (open) => set({ isOtpModalOpen: open }),

  setActiveWorkspace: (workspace) => {
    setCookie("activeWorkspaceId", workspace.id);
    setCookie("viewMode", WalletType.CONSUMER);
    
    set({
      activeWorkspace: workspace,
      viewMode: WalletType.CONSUMER,
      canAccessBilling: canAccessWorkspaceBilling(workspace),
      isLoading: true,
    });

    get().refreshData();
  },

  switchToPersonalWorkspace: async () => {
    let personalWorkspace = findPersonalWorkspace(get().workspaces);

    if (!personalWorkspace) {
      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        await get().fetchWorkspaceDetails(session);
        personalWorkspace = findPersonalWorkspace(get().workspaces);
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to resolve personal workspace",
        };
      }
    }

    if (!personalWorkspace) {
      return {
        success: false,
        error: "Personal workspace not found",
      };
    }

    setCookie("activeWorkspaceId", personalWorkspace.id);
    setCookie("viewMode", WalletType.CONSUMER);

    set({
      activeWorkspace: personalWorkspace,
      viewMode: WalletType.CONSUMER,
      canAccessBilling: true,
      switchingWorkspace: null,
      isOtpModalOpen: false,
      isLoading: true,
    });

    await get().refreshData();
    return { success: true };
  },

  setViewMode: (mode) => {
    const { isProviderModeEnabled, activeWorkspace } = get();
    if (mode === WalletType.PROVIDER && !isProviderModeEnabled) return;

    setCookie("viewMode", mode);
    set({ viewMode: mode });

    // Fetch active workspace balance for the new mode
    if (activeWorkspace && canAccessWorkspaceBilling(activeWorkspace)) {
      smartFetch<{ balance: number }>(`/wallets/balance?type=${mode}`, {
        headers: {
          "X-Workspace-Id": activeWorkspace.id,
        },
      })
        .then((res) => set({ balance: res.balance }))
        .catch(console.error);
    } else {
      set({ balance: 0 });
    }
  },

  createOrganization: async (name, slug, collaborators = [], type, description, avatarUrl, bypassPayment = false) => {
    try {
      const endpoint = bypassPayment ? "/organizations" : "/organizations/checkout-session";
      const res = await smartFetch<{ url?: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ name, slug, collaborators, type, description, avatarUrl }),
      });
      if (bypassPayment) {
        await get().refreshData();
      }
      return { success: true, data: res };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create organization",
      };
    }
  },

  becomeProvider: async () => {
    try {
      await smartFetch("/users/me/enable-provider", {
        method: "POST",
      });
      await get().refreshData();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to enable provider mode",
      };
    }
  },

  triggerWorkspaceSwitch: async (workspace) => {
    if (workspace.type === OwnerType.USER) {
      get().setActiveWorkspace(workspace);
      return { success: true, requiresOtp: false };
    }

    try {
      await smartFetch(`/organizations/${workspace.id}/access-otp/send`, {
        method: "POST",
      });
      
      set({
        switchingWorkspace: workspace,
        isOtpModalOpen: true,
      });
      
      return { success: true, requiresOtp: true };
    } catch (err) {
      return {
        success: false,
        requiresOtp: false,
        error: err instanceof Error ? err.message : "Failed to trigger access OTP",
      };
    }
  },

  confirmWorkspaceSwitch: async (code) => {
    const { switchingWorkspace } = get();
    if (!switchingWorkspace) {
      return { success: false, error: "No organization selected" };
    }

    try {
      await smartFetch(`/organizations/${switchingWorkspace.id}/access-otp/verify`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      // Verification successful, switch context
      setCookie("activeWorkspaceId", switchingWorkspace.id);
      setCookie("viewMode", WalletType.CONSUMER);

      set({
        activeWorkspace: switchingWorkspace,
        viewMode: WalletType.CONSUMER,
        switchingWorkspace: null,
        isOtpModalOpen: false,
        isLoading: true,
      });

      await get().refreshData();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Invalid code. Access denied.",
      };
    }
  },

  fetchWorkspaceDetails: async (session) => {
    if (!session) {
      set({ isLoading: false });
      return;
    }

    try {
      // 1. Fetch user profile and workspaces list
      const profile = await smartFetch<{
        user: { id: string; email: string; fullName: string; providerMode: boolean; isAdmin?: boolean; apiKey?: string };
        workspaces: Array<{ id: string; name: string; slug: string; type: OrgType; userRole: string }>;
      }>("/auth/me");

      const personalWorkspace: Workspace = {
        id: profile.user.id,
        name: `${profile.user.fullName} (Personal)`,
        slug: profile.user.fullName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        type: OwnerType.USER,
        role: OrgRole.OWNER,
      };

      const orgWorkspaces: Workspace[] = profile.workspaces.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: OwnerType.ORG,
        orgType: org.type,
        role: org.userRole as OrgRole,
      }));

      const allWorkspaces = [personalWorkspace, ...orgWorkspaces];

      // 2. Resolve active workspace
      const savedWorkspaceId = getCookie("activeWorkspaceId");
      const active = allWorkspaces.find((w) => w.id === savedWorkspaceId) || allWorkspaces[0];
      setCookie("activeWorkspaceId", active.id);

      // 3. Resolve view mode
      const savedViewMode = getCookie("viewMode") as WalletType | null;
      let activeViewMode: WalletType = WalletType.CONSUMER;
      const canBeProvider =
        active.type === OwnerType.USER
          ? profile.user.providerMode
          : active.orgType === OrgType.PROVIDER || active.orgType === OrgType.HYBRID;

      if (savedViewMode === WalletType.PROVIDER && canBeProvider) {
        activeViewMode = WalletType.PROVIDER;
      }
      setCookie("viewMode", activeViewMode);

      const canAccessBilling = canAccessWorkspaceBilling(active);
      let balance = 0;

      // 4. Fetch active workspace balance only when this workspace role can view billing
      if (canAccessBilling) {
        const walletRes = await smartFetch<{ balance: number }>(
          `/wallets/balance?type=${activeViewMode}`,
          {
            headers: {
              "X-Workspace-Id": active.id,
            },
          }
        );
        balance = walletRes.balance;
      }

      set({
        workspaces: allWorkspaces,
        activeWorkspace: active,
        viewMode: activeViewMode,
        isProviderModeEnabled: canBeProvider,
        balance,
        canAccessBilling,
        isAdmin: !!profile.user.isAdmin,
        apiKey: profile.user.apiKey || "",
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load workspace contexts:", err);
      set({ isLoading: false });
    }
  },

  refreshData: async () => {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    await get().fetchWorkspaceDetails(session);
  },

  rotateApiKey: async () => {
    try {
      const res = await smartFetch<{ key: string }>("/users/me/rotate-api-key", {
        method: "POST",
      });
      set({ apiKey: res.key });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to rotate API Key",
      };
    }
  },

  withdrawFunds: async (amount) => {
    try {
      await smartFetch("/wallets/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      await get().refreshData();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to withdraw funds",
      };
    }
  },
}));
