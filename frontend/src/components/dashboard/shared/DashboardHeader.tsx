import React from "react";
import { LucideIcon } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  description,
  icon: Icon,
  actions,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
      <div className="text-left">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight select-none">
          {Icon && <Icon className="w-5 h-5 text-primary" strokeWidth={2.5} />}
          {title}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto select-none">
          {actions}
        </div>
      )}
    </div>
  );
}
