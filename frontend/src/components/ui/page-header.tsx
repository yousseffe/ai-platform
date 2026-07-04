import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The page's main heading. Accepts a plain string or a node (e.g. an icon + label). */
  title: React.ReactNode;
  /** One-sentence description of what the page does. */
  description?: string;
  /** Action buttons/links rendered on the trailing edge, e.g. a primary CTA. */
  actions?: React.ReactNode;
}

/**
 * Shared page-header atom (title + description + trailing actions) used at
 * the top of nearly every dashboard, settings, admin, and org page. Replaces
 * the dozen near-identical hand-rolled header blocks that had each drifted
 * slightly in heading size, spacing, and border treatment.
 *
 * @param props - Title, optional description, optional actions, plus div props.
 * @returns The React component rendering the page header row.
 */
export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        "mb-7 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-primary">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}
