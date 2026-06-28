"use client";

import React from "react";
import { Server, Zap, Infinity, Check } from "lucide-react";
import { OrgType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Props mapping type structure for StepWorkspaceType component.
 */
interface StepWorkspaceTypeProps {
  /**
   * The currently selected OrgType.
   */
  value: OrgType;
  /**
   * Callback fired when a new OrgType is selected.
   */
  onChange: (type: OrgType) => void;
}

/**
 * Step 1 Wizard Component: Visual Workspace Type Selector.
 * Renders rich premium cards for Provider, Consumer, and Hybrid workspaces.
 * Incorporates active-state gradients, border animations, and wallet initializations guide.
 *
 * @param props - Component parameters.
 * @returns The React element.
 */
export default function StepWorkspaceType({ value, onChange }: StepWorkspaceTypeProps) {
  const options = [
    {
      type: OrgType.CONSUMER,
      title: "AI Consumer Workspace",
      description: "Integrate existing AI marketplace models into your product endpoints and manage consumption credits.",
      icon: Zap,
      accent: "blue",
      borderColor: "border-blue-500/30 dark:border-blue-500/20",
      activeBg: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-500 dark:border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
      glowColor: "group-hover:shadow-[0_0_15px_rgba(59,130,246,0.08)]",
      badgeText: "CONSUMER WALLET ONLY",
      features: ["Integrate marketplace models", "Manage project tokens & API keys", "Access usage analytics"],
    },
    {
      type: OrgType.PROVIDER,
      title: "AI Provider Workspace",
      description: "Publish machine learning models, deploy prediction sandboxes, and earn revenue from API inferences.",
      icon: Server,
      accent: "indigo",
      borderColor: "border-indigo-500/30 dark:border-indigo-500/20",
      activeBg: "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-500 dark:border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
      glowColor: "group-hover:shadow-[0_0_15px_rgba(99,102,241,0.08)]",
      badgeText: "DUAL WALLETS INITIALIZED",
      features: ["Deploy containerized model versions", "Monetize endpoint API calls", "Track billing & publisher revenue"],
    },
    {
      type: OrgType.HYBRID,
      title: "Hybrid AI Workspace",
      description: "Full-capability context: build, deploy, host custom endpoints, and purchase third-party models in the marketplace.",
      icon: Infinity,
      accent: "purple",
      borderColor: "border-purple-500/30 dark:border-purple-500/20",
      activeBg: "bg-purple-50/50 dark:bg-purple-950/10 border-purple-500 dark:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
      glowColor: "group-hover:shadow-[0_0_15px_rgba(168,85,247,0.08)]",
      badgeText: "DUAL WALLETS INITIALIZED",
      features: ["Deploy, host, and run predictions", "Purchase from external publishers", "All billing portals active"],
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-left font-mono">
        <h3 className="text-sm font-bold text-foreground mb-1">What does this organization do?</h3>
        <p className="text-[10px] text-muted-foreground">Select the operational profile that fits your requirements. This governs wallet types initialized and accessible dashboard panels.</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 mt-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = value === opt.type;

          return (
            <Card
              key={opt.type}
              onClick={() => onChange(opt.type)}
              className={`group border cursor-pointer transition-all duration-300 hover:scale-[1.01] overflow-hidden ${
                isActive ? opt.activeBg : `${opt.borderColor} bg-card hover:bg-slate-50/50 dark:hover:bg-slate-900/5`
              } ${opt.glowColor}`}
            >
              <CardContent className="p-4 flex gap-4 font-mono text-left items-start">
                {/* Icon Column */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105 ${
                    isActive
                      ? `bg-${opt.accent}-500/10 text-${opt.accent}-500 border-${opt.accent}-500/20`
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Details Column */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground leading-none">{opt.title}</span>
                    <span
                      className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full tracking-wider select-none leading-none ${
                        isActive
                          ? `bg-${opt.accent}-500/10 text-${opt.accent}-500`
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.badgeText}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans">
                    {opt.description}
                  </p>

                  {/* Features List */}
                  <div className="flex items-center gap-x-3.5 gap-y-1.5 flex-wrap pt-2 text-[9px] text-muted-foreground">
                    {opt.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1 shrink-0">
                        <Check className={`w-3 h-3 ${isActive ? `text-${opt.accent}-500` : "text-slate-400"}`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
