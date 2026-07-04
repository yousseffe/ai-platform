interface AdminDateProps {
  /** ISO timestamp or null. */
  value: string | null;
}

/**
 * Formats admin timestamps with graceful empty-state handling.
 *
 * @param props - Component props.
 * @returns Formatted date text.
 */
export function AdminDate({ value }: AdminDateProps) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span>
      {new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))}
    </span>
  );
}
