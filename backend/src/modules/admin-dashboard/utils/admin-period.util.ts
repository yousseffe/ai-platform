import {
  AdminMetricCard,
  AdminMetricFormat,
  AdminMetricTrend,
} from '../types/admin-dashboard.types';

/**
 * Standard date period ranges used in admin KPI comparisons.
 */
export interface AdminPeriodRange {
  /** Start of the current comparison window. */
  currentStart: Date;
  /** End of the current comparison window. */
  currentEnd: Date;
  /** Start of the immediately previous window. */
  previousStart: Date;
  /** End of the immediately previous window. */
  previousEnd: Date;
}

/**
 * Builds a month-based comparison range anchored on the current time.
 *
 * @param now - Current timestamp.
 * @returns Date boundaries for current and previous months.
 */
export function createMonthlyPeriod(now: Date): AdminPeriodRange {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = now;
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(currentStart.getTime() - 1);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Creates a comparable KPI card from current and previous metric values.
 *
 * @param params - Card values and formatting metadata.
 * @returns Fully computed KPI card.
 */
export function createMetricCard(params: {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  href: string;
  format: AdminMetricFormat;
}): AdminMetricCard {
  const delta = params.value - params.previousValue;
  const changePercent =
    params.previousValue === 0
      ? params.value === 0
        ? 0
        : null
      : Number(((delta / params.previousValue) * 100).toFixed(1));
  const trend: AdminMetricTrend =
    delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';

  return { ...params, changePercent, trend };
}

/**
 * Adds one billing period to a known timestamp.
 *
 * @param date - Input timestamp.
 * @param billingCycle - Billing cycle string.
 * @returns Estimated renewal date.
 */
export function addBillingCycle(
  date: Date,
  billingCycle: 'MONTHLY' | 'ANNUAL' | null,
): Date | null {
  if (!billingCycle) {
    return null;
  }

  const next = new Date(date);
  if (billingCycle === 'ANNUAL') {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  return next;
}
