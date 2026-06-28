"use client";

import React from "react";

interface OrgMetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: "primary" | "blue" | "emerald" | "amber";
  caption?: string;
}

const toneStyles: Record<OrgMetricCardProps["tone"], string> = {
  primary: "border-l-primary text-primary bg-primary/10",
  blue: "border-l-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  emerald: "border-l-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  amber: "border-l-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10",
};

/**
 * Compact metric card matching the main dashboard visual language.
 *
 * @param props - Metric label, value, tone, and icon.
 * @returns A dashboard metric card.
 */
export default function OrgMetricCard({
  label,
  value,
  icon,
  tone,
  caption,
}: OrgMetricCardProps) {
  return (
    <div className={`bg-card border border-border border-l-4 ${toneStyles[tone].split(" ")[0]} rounded-lg p-5 min-h-[120px] flex flex-col justify-between shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className="text-2xl font-extrabold text-foreground mt-1 tracking-tight">{value}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border border-border/40 ${toneStyles[tone].split(" ").slice(1).join(" ")}`}>
          {icon}
        </div>
      </div>
      {caption && (
        <p className="text-[10px] text-muted-foreground pt-3 mt-4 border-t border-border/50">
          {caption}
        </p>
      )}
    </div>
  );
}
