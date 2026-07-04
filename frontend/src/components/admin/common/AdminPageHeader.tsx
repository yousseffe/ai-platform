import Link from "next/link";
import { ReactNode } from "react";

interface AdminPageHeaderProps {
  /** Page title. */
  title: string;
  /** Optional supporting copy. */
  description: string;
  /** Optional right-side action area. */
  action?: ReactNode;
  /** Optional breadcrumb-style back link. */
  backHref?: string;
  /** Back link label. */
  backLabel?: string;
}

/**
 * Reusable page header for the new admin surfaces.
 *
 * @param props - Header props.
 * @returns The admin page header.
 */
export function AdminPageHeader({
  title,
  description,
  action,
  backHref,
  backLabel,
}: AdminPageHeaderProps) {
  return (
    <div className="border-b border-border pb-5">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
