"use client";

import React from "react";
import type { FieldArrayWithId } from "react-hook-form";
import { Mail, Users, Plus, Trash2 } from "lucide-react";
import { OrgRole } from "@/types";
import type { WorkspaceCreateInput } from "@/lib/schemas/workspaces";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Props type structure mapping for StepCollaborators component.
 */
interface StepCollaboratorsProps {
  /**
   * Current list of added collaborators with dynamic fields parameters.
   */
  fields: Array<
    FieldArrayWithId<WorkspaceCreateInput, "collaborators", "id">
  >;
  /**
   * Function to remove a collaborator from list.
   */
  remove: (index: number) => void;
  /**
   * Current invite email state value.
   */
  inviteEmail: string;
  /**
   * Invite email state setter callback.
   */
  setInviteEmail: (email: string) => void;
  /**
   * Current select invite role state value.
   */
  inviteRole: OrgRole;
  /**
   * Invite role state setter callback.
   */
  setInviteRole: (role: OrgRole) => void;
  /**
   * Validation errors occurred during collaborator invitation checks.
   */
  inviteError: string;
  /**
   * Invite error state setter callback.
   */
  setInviteError: (error: string) => void;
  /**
   * Trigger function running collaborator validations and list updates.
   */
  handleAddCollaborator: () => void;
}

/**
 * Step 3 Wizard Component: Invitation layer.
 * Guides users in adding collaborators to their workspace prior to checkout execution.
 *
 * @param props - Component parameters.
 * @returns The React element.
 */
export default function StepCollaborators({
  fields,
  remove,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteError,
  setInviteError,
  handleAddCollaborator,
}: StepCollaboratorsProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-left font-mono">
        <h3 className="text-sm font-bold text-foreground mb-1">Invite Workspace Teammates</h3>
        <p className="text-[10px] text-muted-foreground">Add engineers and administrators to collaborate on models and keys. You can also configure this later.</p>
      </div>

      <div className="space-y-4 font-mono text-xs text-left">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invite Teammates <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError("");
                }}
                className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary ${
                  inviteError ? "border-red-500" : ""
                }`}
                placeholder="collaborator@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCollaborator();
                  }
                }}
              />
            </div>

            <Select
              value={inviteRole}
              onValueChange={(val) => setInviteRole(val as OrgRole)}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-10 border-slate-200 text-xs font-semibold">
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrgRole.MAINTAINER}>Maintainer</SelectItem>
                <SelectItem value={OrgRole.CONTRIBUTOR}>Contributor</SelectItem>
                <SelectItem value={OrgRole.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              onClick={handleAddCollaborator}
              className="bg-primary hover:bg-primary/95 text-primary-foreground h-10 text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Invite
            </Button>
          </div>
          {inviteError && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">
              ⚠️ {inviteError}
            </p>
          )}
        </div>

        {fields.length > 0 ? (
          <div className="border border-slate-100 dark:border-border/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 transition-all duration-300">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-3 border-b border-slate-100 dark:border-border/60 bg-white dark:bg-slate-950/20 flex justify-between items-center">
              <span>Invited Members</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px]">
                {fields.length}
              </span>
            </p>
            <div className="divide-y divide-slate-100 dark:divide-border/60 max-h-[180px] overflow-y-auto bg-white dark:bg-slate-950/10">
              {fields.map((member, index) => (
                <div
                  key={member.id}
                  className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group animate-in slide-in-from-left-2 duration-200"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {member.email}
                    </span>
                    <span className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5">
                      {member.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                    title="Remove invitation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[120px] border border-dashed border-slate-200 dark:border-border/80 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50/30 dark:bg-slate-900/5 transition-all">
            <Users className="w-6 h-6 opacity-30" />
            <p className="text-xs">No team members invited yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
