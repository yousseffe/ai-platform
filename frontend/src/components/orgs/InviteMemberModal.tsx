"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { OrgRole } from "@/types";
import { inviteOrgMember } from "@/lib/services/organizations.service";
import { getOrgRoleMeta } from "@/lib/org-role-meta";
import OrgRoleCombobox from "@/components/orgs/OrgRoleCombobox";
import { useOrgContext } from "@/hooks/use-org-context";

interface InviteMemberModalProps {
  orgId: string;
  orgType?: string;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

/**
 * Modal for inviting a new member to the organization.
 * OWNER role cannot be assigned via this form.
 *
 * @param orgId - UUID of the organization.
 * @param open - Whether the modal is visible.
 * @param onClose - Callback to close the modal.
 * @param onInvited - Fires after successful invitation to refresh the list.
 * @returns The React modal component.
 */
export default function InviteMemberModal({
  orgId,
  orgType,
  open,
  onClose,
  onInvited,
}: InviteMemberModalProps) {
  const { myRole } = useOrgContext();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>(OrgRole.CONTRIBUTOR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setIsSubmitting(true);
    try {
      await inviteOrgMember(orgId, email.trim(), role);
      toast.success(`Invitation sent to ${email}`);
      onInvited();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole(OrgRole.CONTRIBUTOR);
    onClose();
  };

  const assignableRoleValues = myRole === OrgRole.OWNER
    ? [OrgRole.MAINTAINER, OrgRole.CONTRIBUTOR, OrgRole.VIEWER]
    : [OrgRole.CONTRIBUTOR, OrgRole.VIEWER];
  const assignableRoles = assignableRoleValues.map((value) => {
    const meta = getOrgRoleMeta(value, orgType);
    return {
      value,
      label: meta.longLabel,
      description: meta.description,
    };
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <DialogTitle className="text-base">Invite Member</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Invite a collaborator by email and assign their role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Role</Label>
            <OrgRoleCombobox
              orgType={orgType}
              value={role}
              onChange={setRole}
              roles={assignableRoleValues}
              disabled={isSubmitting}
              className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              itemClassName="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {assignableRoles.find((item) => item.value === role)?.description}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button size="sm" onClick={handleInvite} disabled={isSubmitting || !email.trim()}>
            {isSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Inviting...</> : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
