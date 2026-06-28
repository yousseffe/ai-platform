import { OrgRole, OrgType } from "@/types";

export interface OrgRoleMeta {
  shortLabel: string;
  longLabel: string;
  description: string;
}

const DEFAULT_ROLE_META: Record<OrgRole, OrgRoleMeta> = {
  [OrgRole.OWNER]: {
    shortLabel: "Owner",
    longLabel: "Organization Owner",
    description: "Accountable owner for workspace governance, billing, settings, members, and final policy decisions.",
  },
  [OrgRole.MAINTAINER]: {
    shortLabel: "Maintainer",
    longLabel: "Organization Maintainer",
    description: "Trusted operator who manages day-to-day workspace access and operational governance.",
  },
  [OrgRole.CONTRIBUTOR]: {
    shortLabel: "Contributor",
    longLabel: "Organization Contributor",
    description: "Contributes work inside the workspace without approving governance decisions or managing members.",
  },
  [OrgRole.VIEWER]: {
    shortLabel: "Viewer",
    longLabel: "Organization Viewer",
    description: "Read-only access for monitoring, reporting, and stakeholder visibility.",
  },
};

const PROVIDER_ROLE_META: Record<OrgRole, OrgRoleMeta> = {
  [OrgRole.OWNER]: {
    shortLabel: "Owner",
    longLabel: "Provider Organization Owner",
    description: "Owns provider governance: manages members and roles, approves releases, enforces deployment decisions, and controls billing/settings.",
  },
  [OrgRole.MAINTAINER]: {
    shortLabel: "Maintainer",
    longLabel: "Provider Maintainer",
    description: "Reviews submitted versions, inspects artifacts and test plans, approves or declines releases, and manages provider members.",
  },
  [OrgRole.CONTRIBUTOR]: {
    shortLabel: "Contributor",
    longLabel: "Provider Contributor",
    description: "Submits models and versions for review, prepares artifacts, and saves test cases without approval authority.",
  },
  [OrgRole.VIEWER]: {
    shortLabel: "Viewer",
    longLabel: "Provider Viewer",
    description: "Reads model registry, version status, review history, analytics, and marketplace readiness without changing anything.",
  },
};

const CONSUMER_ROLE_META: Partial<Record<OrgRole, OrgRoleMeta>> = {
  [OrgRole.OWNER]: {
    shortLabel: "Owner",
    longLabel: "Consumer Organization Owner",
    description: "Owns consumption governance: manages members, billing, projects, scoped API keys, and workspace settings.",
  },
  [OrgRole.MAINTAINER]: {
    shortLabel: "Maintainer",
    longLabel: "Consumer Maintainer",
    description: "Manages projects, scoped API keys, usage operations, and member access for consuming marketplace models.",
  },
  [OrgRole.CONTRIBUTOR]: {
    shortLabel: "Contributor",
    longLabel: "Consumer Contributor",
    description: "Works with project integrations and API-key operations without controlling billing or workspace policy.",
  },
  [OrgRole.VIEWER]: {
    shortLabel: "Viewer",
    longLabel: "Consumer Viewer",
    description: "Read-only visibility into projects, usage, and spend for leadership, finance, or clients.",
  },
};

export function getOrgRoleMeta(role: OrgRole, orgType?: OrgType | string | null): OrgRoleMeta {
  if (orgType === OrgType.PROVIDER) {
    return PROVIDER_ROLE_META[role] ?? PROVIDER_ROLE_META[OrgRole.VIEWER];
  }

  if (orgType === OrgType.CONSUMER && CONSUMER_ROLE_META[role]) {
    return CONSUMER_ROLE_META[role]!;
  }

  return DEFAULT_ROLE_META[role] ?? DEFAULT_ROLE_META[OrgRole.VIEWER];
}
