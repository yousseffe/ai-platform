interface AdminEmptyStateProps {
  /** Empty-state title. */
  title: string;
  /** Supporting description. */
  description: string;
}

/**
 * Neutral empty state used across new admin pages.
 *
 * @param props - Component props.
 * @returns Empty state block.
 */
export function AdminEmptyState({
  title,
  description,
}: AdminEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
