"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Layers,
  Workflow,
  Settings,
  User,
  Coins,
  Key,
  Plug,
  Plus,
  Shield,
  Compass,
  Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspace, Workspace } from "@/hooks/use-workspace";
import { OwnerType } from "@/types";

interface CommandPaletteProps {
  /** Whether the palette dialog is currently visible. */
  open: boolean;
  /** Invoked when the dialog should open or close. */
  onOpenChange: (open: boolean) => void;
}

interface CommandEntry {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

/**
 * Global command palette (Ctrl/Cmd+K) for jumping to core sections of the app
 * and switching workspaces without hunting through the sidebar. Built on the
 * existing Dialog primitive so it matches the rest of the app's overlay styling.
 *
 * @param props - Open state and change handler owned by LayoutShell.
 * @returns The React component rendering the command palette dialog.
 */
export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { workspaces, isAdmin, isProviderModeEnabled, triggerWorkspaceSwitch } = useWorkspace();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const navigate = (path: string) => {
    router.push(path);
    onOpenChange(false);
  };

  const switchWorkspace = (workspace: Workspace) => {
    if (workspace.type === OwnerType.USER) {
      triggerWorkspaceSwitch(workspace);
    } else {
      router.push(`/orgs/${workspace.slug}/overview`);
    }
    onOpenChange(false);
  };

  const commands = useMemo<CommandEntry[]>(() => {
    const entries: CommandEntry[] = [
      { id: "dashboard", label: "Dashboard Overview", group: "Navigate", icon: <LayoutGrid className="w-4 h-4" />, onSelect: () => navigate("/dashboard") },
    ];

    if (isAdmin) {
      entries.push({ id: "admin", label: "Admin Console", group: "Navigate", icon: <Shield className="w-4 h-4" />, onSelect: () => navigate("/admin") });
    }

    if (isProviderModeEnabled) {
      entries.push(
        { id: "models", label: "Models Registry", group: "Navigate", icon: <Layers className="w-4 h-4" />, onSelect: () => navigate("/models") },
        { id: "models-upload", label: "Upload New Model", group: "Navigate", icon: <Plus className="w-4 h-4" />, onSelect: () => navigate("/models/upload") },
        { id: "pipelines", label: "Pipelines", group: "Navigate", icon: <Workflow className="w-4 h-4" />, onSelect: () => navigate("/pipelines") },
      );
    }

    entries.push(
      { id: "explore", label: "Explore Marketplace", group: "Navigate", icon: <Compass className="w-4 h-4" />, onSelect: () => navigate("/explore") },
      { id: "settings-profile", label: "Profile & Role", group: "Settings", icon: <User className="w-4 h-4" />, onSelect: () => navigate("/settings/profile") },
      { id: "settings-billing", label: "Billing & Wallet", group: "Settings", icon: <Coins className="w-4 h-4" />, onSelect: () => navigate("/settings/billing") },
      { id: "settings-api", label: "API Credentials", group: "Settings", icon: <Key className="w-4 h-4" />, onSelect: () => navigate("/settings/api") },
      { id: "settings-mcp", label: "MCP Access Tokens", group: "Settings", icon: <Plug className="w-4 h-4" />, onSelect: () => navigate("/settings/mcp-tokens") },
      { id: "workspaces-create", label: "Create Organization", group: "Settings", icon: <Settings className="w-4 h-4" />, onSelect: () => navigate("/workspaces/create") },
    );

    workspaces.forEach((workspace) => {
      entries.push({
        id: `workspace-${workspace.id}`,
        label: `Switch to ${workspace.name}`,
        group: "Workspaces",
        icon: <Building2 className="w-4 h-4" />,
        onSelect: () => switchWorkspace(workspace),
      });
    });

    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, isAdmin, isProviderModeEnabled]);

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase())
  );

  const groups = Array.from(new Set(filteredCommands.map((command) => command.group)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[480px] p-0 gap-0 top-[20%] translate-y-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search or jump to..."
          className="w-full px-4 py-3.5 bg-transparent border-b border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none"
        />

        <div className="max-h-80 overflow-y-auto p-1.5">
          {filteredCommands.length === 0 && (
            <EmptyState
              icon={<Compass />}
              title="No matches"
              description="Try a different search term."
              className="py-8"
            />
          )}

          {groups.map((group) => (
            <div key={group} className="mb-1 last:mb-0">
              <p className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {group}
              </p>
              {filteredCommands
                .filter((command) => command.group === group)
                .map((command) => (
                  <button
                    key={command.id}
                    type="button"
                    onClick={command.onSelect}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm text-foreground hover:bg-secondary focus:bg-secondary transition-colors cursor-pointer outline-none"
                  >
                    <span className="text-muted-foreground">{command.icon}</span>
                    {command.label}
                  </button>
                ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
