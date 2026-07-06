import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color?: "primary" | "blue" | "emerald" | "amber";
  footerText?: string;
  actionLabel?: string;
  actionHref?: string;
  actionDisabledText?: string;
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  color = "primary",
  footerText,
  actionLabel,
  actionHref,
  actionDisabledText,
}: MetricCardProps) {
  const borderClasses = {
    primary: "border-l-primary hover:border-primary/30",
    blue: "border-l-blue-500 hover:border-blue-500/30",
    emerald: "border-l-emerald-500 hover:border-emerald-500/30",
    amber: "border-l-amber-500 hover:border-amber-500/30",
  };

  const iconClasses = {
    primary: "bg-primary/10 text-primary border-primary/15",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/15",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/15",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15",
  };

  return (
    <Card className={cn(
      "border border-border bg-card border-l-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden text-left rounded-xl select-none",
      borderClasses[color]
    )}>
      {/* Glow background */}
      <div className="absolute right-[-2rem] bottom-[-2rem] w-24 h-24 bg-primary/3 rounded-full blur-xl pointer-events-none" />
      
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[115px]">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-lg border", iconClasses[color])}>
            <Icon className="w-4 h-4" strokeWidth={2} />
          </div>
        </div>
        
        {(footerText || actionLabel) && (
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            {footerText && (
              <span className="text-[10px] text-muted-foreground font-mono">{footerText}</span>
            )}
            {actionLabel && actionHref && (
              <Link href={actionHref} className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 transition duration-150">
                {actionLabel}
              </Link>
            )}
            {actionLabel && !actionHref && actionDisabledText && (
              <span className="text-[10px] text-muted-foreground font-mono">{actionDisabledText}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
