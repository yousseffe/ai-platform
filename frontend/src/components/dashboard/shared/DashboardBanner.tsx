import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardBannerProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: "primary" | "emerald" | "blue" | "amber";
  badgeText?: string;
  isLive?: boolean;
}

export default function DashboardBanner({
  title,
  description,
  icon: Icon,
  color = "primary",
  badgeText,
  isLive = false,
}: DashboardBannerProps) {
  const bgClasses = {
    primary: "bg-primary/[0.03] dark:bg-primary/[0.05] border-primary/20 dark:border-primary/35",
    emerald: "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] border-emerald-500/20 dark:border-emerald-500/35",
    blue: "bg-blue-500/[0.03] dark:bg-blue-500/[0.05] border-blue-500/20 dark:border-blue-500/35",
    amber: "bg-amber-500/[0.03] dark:bg-amber-500/[0.05] border-amber-500/20 dark:border-amber-500/35",
  };

  const iconWrapperClasses = {
    primary: "bg-primary/10 text-primary border-primary/15",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15",
  };

  const textColors = {
    primary: "text-primary",
    emerald: "text-emerald-650 dark:text-emerald-400",
    blue: "text-blue-650 dark:text-blue-400",
    amber: "text-amber-650 dark:text-amber-450",
  };

  return (
    <div className={cn("p-3.5 border rounded-xl text-left flex flex-col sm:flex-row items-start sm:items-center gap-3.5 text-xs shadow-xs transition-all duration-200 select-none", bgClasses[color])}>
      <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0 border", iconWrapperClasses[color])}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 leading-relaxed text-muted-foreground">
        <strong className={cn("font-semibold mr-1", textColors[color])}>{title}</strong>
        {description}
      </div>
      {(badgeText || isLive) && (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live
            </span>
          )}
          {badgeText && !isLive && (
            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border", iconWrapperClasses[color])}>
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
