"use client";

import React from "react";
import { Mail, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepCollaboratorsProps {
  inviteEmail: string;
  inviteRole: "MAINTAINER" | "CONTRIBUTOR" | "VIEWER";
  invitedMembers: Array<{ email: string; role: string }>;
  onEmailChange: (val: string) => void;
  onRoleChange: (role: "MAINTAINER" | "CONTRIBUTOR" | "VIEWER") => void;
  onAddInvite: (e: React.FormEvent) => void;
  onRemoveInvite: (email: string) => void;
}

/**
 * Step 2 of Organization Creation: Collaborators list and invitations.
 * Migrated to Shadcn UI components.
 *
 * @param props - Component props containing state and action handlers.
 * @returns The React component rendering the teammate enrollment step.
 */
export default function StepCollaborators({
  inviteEmail,
  inviteRole,
  invitedMembers,
  onEmailChange,
  onRoleChange,
  onAddInvite,
  onRemoveInvite,
}: StepCollaboratorsProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <form onSubmit={onAddInvite} className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            className="pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500"
            placeholder="collaborator@company.com"
          />
        </div>

        <Select
          value={inviteRole}
          onValueChange={(val) => onRoleChange(val as typeof inviteRole)}
        >
          <SelectTrigger className="w-[130px] h-10 border-slate-200 text-xs font-semibold">
            <SelectValue placeholder="Select Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MAINTAINER">Maintainer</SelectItem>
            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white h-10 text-xs font-bold cursor-pointer">
          Invite
        </Button>
      </form>

      {invitedMembers.length > 0 ? (
        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-3 border-b border-slate-100 bg-white">
            Invited Members ({invitedMembers.length})
          </p>
          <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto bg-white">
            {invitedMembers.map((member) => (
              <div key={member.email} className="p-3 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">{member.email}</span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">
                    {member.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveInvite(member.email)}
                  className="text-red-500 hover:text-red-700 font-semibold cursor-pointer hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[120px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50/50">
          <Users className="w-6 h-6 opacity-40" />
          <p className="text-xs">No team members invited yet.</p>
        </div>
      )}
    </div>
  );
}
