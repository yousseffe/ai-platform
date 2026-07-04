interface AdminStatusBadgeProps {
  /** Status label. */
  value: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  FREE: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  SUSPENDED: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  ORG: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  USER: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
};

/**
 * Small semantic badge for admin statuses and owner scopes.
 *
 * @param props - Component props.
 * @returns Status badge.
 */
export function AdminStatusBadge({ value }: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        STATUS_STYLES[value] ?? "bg-muted text-muted-foreground border-border"
      }`}
    >
      {value}
    </span>
  );
}
