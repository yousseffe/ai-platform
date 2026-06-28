"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction, OrgRole } from "@/types";
import {
  listOrgMembers,
  removeOrgMember,
  updateOrgMemberRole,
  OrgMember,
} from "@/lib/services/organizations.service";
import { Users, Plus, Loader2, Trash2, ShieldCheck, UserRoundCog, Eye, Crown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import RoleBadge from "@/components/orgs/RoleBadge";
import InviteMemberModal from "@/components/orgs/InviteMemberModal";
import { getOrgRoleMeta } from "@/lib/org-role-meta";
import OrgRoleCombobox from "@/components/orgs/OrgRoleCombobox";

/**
 * Members management page — lists all org members with their roles.
 * OWNER/MAINTAINER can invite and update roles. OWNER can also remove members.
 *
 * @returns The React page component.
 */
export default function OrgMembersPage() {
  const { org, can, myRole } = useOrgContext();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!org) return;
    setIsLoading(true);
    try {
      setMembers(await listOrgMembers(org.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }, [org]);

  useEffect(() => {
    Promise.resolve().then(fetchMembers);
  }, [fetchMembers]);

  const handleRemove = async (userId: string, email?: string) => {
    if (!org || !confirm(`Remove ${email ?? "this member"} from the organization?`)) return;
    try {
      await removeOrgMember(org.id, userId);
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    }
  };

  const handleRoleChange = async (userId: string, newRole: OrgRole) => {
    if (!org) return;
    try {
      await updateOrgMemberRole(org.id, userId, newRole);
      toast.success("Role updated");
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    }
  };

  if (!org) return null;

  const canInvite = can(OrgAction.INVITE_MEMBERS);
  const canRemove = can(OrgAction.REMOVE_MEMBERS);
  const assignableRoleValues = myRole === OrgRole.OWNER
    ? [OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR, OrgRole.VIEWER]
    : [OrgRole.CONTRIBUTOR, OrgRole.VIEWER];
  const roleCounts = members.reduce<Record<OrgRole, number>>(
    (acc, member) => {
      acc[member.role] += 1;
      return acc;
    },
    {
      [OrgRole.OWNER]: 0,
      [OrgRole.MAINTAINER]: 0,
      [OrgRole.CONTRIBUTOR]: 0,
      [OrgRole.VIEWER]: 0,
    }
  );

  const roleSummary = [
    { role: OrgRole.OWNER, icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
    { role: OrgRole.MAINTAINER, icon: <UserRoundCog className="w-4 h-4" strokeWidth={1.7} />, tone: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
    { role: OrgRole.CONTRIBUTOR, icon: <Users className="w-4 h-4" strokeWidth={1.7} />, tone: "text-primary bg-primary/10 border-primary/20" },
    { role: OrgRole.VIEWER, icon: <Eye className="w-4 h-4" strokeWidth={1.7} />, tone: "text-muted-foreground bg-secondary/50 border-border" },
  ];

  return (
    <div className="space-y-5 max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set clear business roles and access levels for your organization team.
          </p>
        </div>
        {canInvite && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Invite Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {roleSummary.map((item) => {
          const meta = getOrgRoleMeta(item.role, org.type);
          return (
          <div key={item.role} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${item.tone}`}>
              {item.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground leading-none">{roleCounts[item.role]}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{meta.shortLabel}s</p>
            </div>
          </div>
        )})}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roleSummary.map((item) => {
          const meta = getOrgRoleMeta(item.role, org.type);
          return (
            <div key={`${item.role}-guide`} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{meta.longLabel}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Organization RBAC</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Owner and Maintainer are the governance roles for this workspace. They manage members, approve provider versions and deployments, and enforce organization decisions.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-background/70 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <Crown className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Platform Administrator</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Platform Administrator is not an organization role. It belongs to the platform admin console for global users, pricing, infrastructure, and support oversight.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Team Directory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {members.length} member{members.length !== 1 ? "s" : ""} with active workspace access.
              </p>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Member</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isOwner = member.role === OrgRole.OWNER;
                const canEditRole =
                  canInvite &&
                  !isOwner &&
                  (myRole === OrgRole.OWNER || member.role !== OrgRole.MAINTAINER);
                const displayName = member.fullName?.trim() || member.email || "Unknown member";
                const email = member.email ?? "";
                const initials = displayName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase() || "U";

                return (
                  <tr key={member.userId} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-[11px] font-extrabold text-primary shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{email || "No email available"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEditRole ? (
                        <OrgRoleCombobox
                          orgType={org.type}
                          value={member.role}
                          onChange={(nextRole) => handleRoleChange(member.userId, nextRole)}
                          roles={assignableRoleValues}
                          className="flex h-7 w-40 items-center justify-between rounded-[min(var(--radius-md),10px)] border border-border bg-transparent py-1.5 pr-2 pl-2.5 text-xs transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          itemClassName="text-xs"
                        />
                      ) : (
                        <RoleBadge role={member.role} orgType={org.type} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRemove && !isOwner && (
                        <button onClick={() => handleRemove(member.userId, email)} className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 px-2 py-1.5 rounded-md transition-all" title="Remove member">
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InviteMemberModal orgId={org.id} orgType={org.type} open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={fetchMembers} />
    </div>
  );
}
