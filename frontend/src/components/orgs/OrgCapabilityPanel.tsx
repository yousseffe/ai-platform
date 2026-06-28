"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CreditCard,
  FolderKanban,
  KeyRound,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";
import { OrgAction, OrgType } from "@/types";
import { useOrgContext } from "@/hooks/use-org-context";

interface OrgCapabilityPanelProps {
  orgSlug: string;
  orgType: OrgType;
}

/**
 * Explains the enabled workspace capabilities for a given organization type.
 *
 * @param props - Organization route and type metadata.
 * @returns Capability cards for consumer, provider, or hybrid organizations.
 */
export default function OrgCapabilityPanel({
  orgSlug,
  orgType,
}: OrgCapabilityPanelProps) {
  const { can } = useOrgContext();
  const canConsume = orgType === OrgType.CONSUMER || orgType === OrgType.HYBRID;
  const canProvide = orgType === OrgType.PROVIDER || orgType === OrgType.HYBRID;

  const capabilities = [
    {
      title: "Consume Models",
      description: "Create projects, generate scoped API keys, and call marketplace models from team applications.",
      icon: <FolderKanban className="w-4 h-4" strokeWidth={1.8} />,
      href: `/orgs/${orgSlug}/projects`,
      enabled: canConsume && can(OrgAction.VIEW_PROJECTS),
      accent: "border-l-blue-500",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Publish Models",
      description: "Submit model versions, review artifacts and test plans, approve releases, and verify marketplace readiness.",
      icon: <Layers className="w-4 h-4" strokeWidth={1.8} />,
      href: `/orgs/${orgSlug}/models`,
      enabled: canProvide && can(OrgAction.VIEW_MODELS),
      accent: "border-l-emerald-500",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Team Billing",
      description: "Top up shared credits, review provider earnings, and keep organization spend separate.",
      icon: <CreditCard className="w-4 h-4" strokeWidth={1.8} />,
      href: `/orgs/${orgSlug}/billing`,
      enabled: can(OrgAction.VIEW_BILLING),
      accent: "border-l-amber-500",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {capabilities.map((capability) => (
        <Link
          key={capability.title}
          href={capability.enabled ? capability.href : "#"}
          className={`group border border-border border-l-4 ${capability.accent} bg-card rounded-lg p-4 min-h-[150px] flex flex-col justify-between transition-all ${
            capability.enabled
              ? "hover:border-muted-foreground/30 hover:-translate-y-0.5 hover:shadow-sm"
              : "opacity-55 pointer-events-none"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className={`w-8 h-8 rounded-lg ${capability.bg} ${capability.color} flex items-center justify-center`}>
                {capability.icon}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                capability.enabled
                  ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/10"
                  : "text-muted-foreground border-border bg-secondary/30"
              }`}>
                {capability.enabled ? "Enabled" : "Locked"}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{capability.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {capability.description}
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between text-[11px] font-semibold text-primary">
            <span>{capability.enabled ? "Open workspace area" : "Not available for this type"}</span>
            {capability.enabled && <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
          </div>
        </Link>
      ))}
    </div>
  );
}

export const providerWorkflowSteps = [
  {
    title: "Submit Work",
    description: "Contributors submit models, artifacts, preprocess, postprocess, and test cases.",
    icon: <Boxes className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Review Version",
    description: "Owner or Maintainer reviews artifacts and approves or declines the version.",
    icon: <KeyRound className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Build and Verify",
    description: "Approved versions start the build pipeline and can appear verified in the marketplace.",
    icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Audit Governance",
    description: "Every submission, test case, approval, and decline is kept in organization history.",
    icon: <Users className="w-4 h-4" strokeWidth={1.7} />,
  },
];

export const consumerWorkflowSteps = [
  {
    title: "Create Project",
    description: "Separate every product or application into its own project workspace.",
    icon: <Boxes className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Generate API Key",
    description: "Issue scoped keys for each project and keep usage isolated.",
    icon: <KeyRound className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Call Marketplace Models",
    description: "Use the org wallet for predictions while logs stay tied to the team.",
    icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />,
  },
  {
    title: "Monitor Usage",
    description: "Review project usage, spend, and member activity without mixing personal data.",
    icon: <Users className="w-4 h-4" strokeWidth={1.7} />,
  },
];
