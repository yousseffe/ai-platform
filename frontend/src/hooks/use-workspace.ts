import { create } from "zustand";
import { Session } from "next-auth";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { OwnerType, OrgRole, WalletType } from "@/types";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: OwnerType;
  role: OrgRole;
}

interface WorkspaceState {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  viewMode: WalletType;
  balance: number;
  isLoading: boolean;
  isProviderModeEnabled: boolean;
  setActiveWorkspace: (workspace: Workspace) => void;
  setViewMode: (mode: WalletType) => void;
  createOrganization: (name: string, slug: string) => Promise<{ success: boolean; error?: string }>;
  becomeProvider: () => Promise<{ success: boolean; error?: string }>;
  fetchWorkspaceDetails: (session: Session | null) => Promise<void>;
  refreshData: () => Promise<void>;
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
 * Zustand store to manage multi-tenant workspaces, active view mode,
 * credit ledgers, and organization creation onboarding parameters.
 */
export const useWorkspace = create<WorkspaceState>((set, get) => ({
  activeWorkspace: null,
  workspaces: [],
  viewMode: WalletType.CONSUMER,
  balance: 0.00,
  isLoading: true,
  isProviderModeEnabled: false,

  setActiveWorkspace: (workspace) => {
    setCookie("activeWorkspaceId", workspace.id);
    setCookie("viewMode", WalletType.CONSUMER);
    
    set({
      activeWorkspace: workspace,
      viewMode: WalletType.CONSUMER,
      isLoading: true,
    });

    get().refreshData();
  },

  setViewMode: (mode) => {
    const { isProviderModeEnabled, activeWorkspace } = get();
    if (mode === WalletType.PROVIDER && !isProviderModeEnabled) return;

    setCookie("viewMode", mode);
    set({ viewMode: mode });

    // Fetch active workspace balance for the new mode
    if (activeWorkspace) {
      smartFetch<{ balance: number }>(`/wallets/balance?type=${mode}`, {
        headers: {
          "X-Workspace-Id": activeWorkspace.id,
        },
      })
        .then((res) => set({ balance: res.balance }))
        .catch(console.error);
    }
  },

  createOrganization: async (name, slug) => {
    try {
      await smartFetch("/organizations", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      });
      await get().refreshData();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create organization",
      };
    }
  },

  becomeProvider: async () => {
    try {
      await smartFetch("/users/enable-provider", {
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

  fetchWorkspaceDetails: async (session) => {
    if (!session) {
      set({ isLoading: false });
      return;
    }

    try {
      // 1. Fetch user profile and workspaces list
      const profile = await smartFetch<{
        user: { id: string; email: string; username: string; isProvider: boolean };
        workspaces: Array<{ id: string; name: string; slug: string; userRole: string; isProvider: boolean }>;
      }>("/auth/me");

      const personalWorkspace: Workspace = {
        id: profile.user.id,
        name: `${profile.user.username} (Personal)`,
        slug: profile.user.username,
        type: OwnerType.USER,
        role: OrgRole.OWNER,
      };

      const orgWorkspaces: Workspace[] = profile.workspaces.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: OwnerType.ORG,
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
      const canBeProvider = active.type === OwnerType.ORG || profile.user.isProvider;

      if (savedViewMode === WalletType.PROVIDER && canBeProvider) {
        activeViewMode = WalletType.PROVIDER;
      }
      setCookie("viewMode", activeViewMode);

      // 4. Fetch active workspace balance
      const walletRes = await smartFetch<{ balance: number }>(
        `/wallets/balance?type=${activeViewMode}`,
        {
          headers: {
            "X-Workspace-Id": active.id,
          },
        }
      );

      set({
        workspaces: allWorkspaces,
        activeWorkspace: active,
        viewMode: activeViewMode,
        isProviderModeEnabled: canBeProvider,
        balance: walletRes.balance,
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
}));
