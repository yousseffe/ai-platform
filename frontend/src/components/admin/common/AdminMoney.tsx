interface AdminMoneyProps {
  /** Numeric amount in EGP. */
  amount: number;
}

/**
 * Formats admin monetary values consistently.
 *
 * @param props - Component props.
 * @returns Formatted money text.
 */
export function AdminMoney({ amount }: AdminMoneyProps) {
  return (
    <span>
      {new Intl.NumberFormat("en-EG", {
        style: "currency",
        currency: "EGP",
        maximumFractionDigits: 2,
      }).format(amount)}
    </span>
  );
}
