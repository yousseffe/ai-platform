import * as React from "react";

import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
} as const;

interface StatCardProps extends React.ComponentProps<"div"> {
  /** Icon rendered inside the accent chip, typically a lucide-react icon. */
  icon: React.ReactNode;
  /** Small eyebrow label describing the metric, e.g. "Total Models". */
  label: string;
  /** The headline value, usually a number or short string. */
  value: React.ReactNode;
  /** Optional short caption below the value, e.g. "Active profiles". */
  caption?: React.ReactNode;
  /** Color family for the icon chip. Defaults to a neutral tone. */
  tone?: keyof typeof TONE_CLASSES;
}

/**
 * Shared metric-card atom used across dashboards, registries, and admin
 * consoles (icon chip + eyebrow label + headline value + optional caption).
 * Consolidates what used to be a dozen near-identical hand-rolled stat
 * blocks scattered across the app into one consistently styled component.
 *
 * @param props - Icon, label, value, optional caption/tone, plus div props.
 * @returns The React component rendering a single stat card.
 */
export function StatCard({
  icon,
  label,
  value,
  caption,
  tone = "default",
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-muted-foreground/25",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "mb-3 flex h-9 w-9 items-center justify-center rounded-lg [&_svg]:h-4.5 [&_svg]:w-4.5",
          TONE_CLASSES[tone]
        )}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
