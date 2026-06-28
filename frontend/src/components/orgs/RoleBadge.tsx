"use client";

import React from "react";
import { OrgRole } from "@/types";
import { Shield, Wrench, Pencil, Eye } from "lucide-react";
import { getOrgRoleMeta } from "@/lib/org-role-meta";

interface RoleBadgeProps {
  role: OrgRole | string;
  orgType?: string | null;
  size?: "xs" | "sm";
}

const ROLE_CONFIG: Record<string, { label: string; classes: string; Icon: React.ElementType }> = {
  [OrgRole.OWNER]: {
    label: "Owner",
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Icon: Shield,
  },
  [OrgRole.MAINTAINER]: {
    label: "Maintainer",
    classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Icon: Wrench,
  },
  [OrgRole.CONTRIBUTOR]: {
    label: "Contributor",
    classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Icon: Pencil,
  },
  [OrgRole.VIEWER]: {
    label: "Viewer",
    classes: "bg-muted text-muted-foreground border-border",
    Icon: Eye,
  },
};

const SIZE_CLASSES = {
  xs: "text-[9px] px-1.5 py-0.5 gap-1",
  sm: "text-[10px] px-2 py-0.5 gap-1",
};

/**
 * Color-coded role badge for an org member.
 *
 * @param role - The OrgRole value.
 * @param size - Badge size (xs or sm). Defaults to sm.
 * @returns The React badge component.
 */
export default function RoleBadge({ role, orgType, size = "sm" }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG[OrgRole.VIEWER];
  const { classes, Icon } = config;
  const { shortLabel } = getOrgRoleMeta(role as OrgRole, orgType);

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${classes} ${SIZE_CLASSES[size]}`}
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2} />
      {shortLabel}
    </span>
  );
}
