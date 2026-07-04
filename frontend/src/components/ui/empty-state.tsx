import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Props for the shared EmptyState atom.
 */
interface EmptyStateProps extends React.ComponentProps<"div"> {
  /** Icon rendered inside the accent circle, typically a lucide-react icon. */
  icon: React.ReactNode;
  /** Short headline describing the empty condition. */
  title: string;
  /** One or two sentence explanation or next-step hint. */
  description?: string;
  /** Optional action slot, usually a Button or Link styled as a button. */
  action?: React.ReactNode;
}

/**
 * Shared empty-state placeholder for tables, lists, and panels with no data.
 * Keeps icon/title/description/action layout consistent across the app instead
 * of every table inventing its own "no rows" markup.
 *
 * @param props - Icon, title, optional description and action, plus div props.
 * @returns The React component rendering the empty-state block.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-14 px-6 text-center",
        className
      )}
      {...props}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
