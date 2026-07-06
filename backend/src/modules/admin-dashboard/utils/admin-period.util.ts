import {
  AdminMetricCard,
  AdminMetricFormat,
  AdminMetricTrend,
} from '../types/admin-dashboard.types';

export interface AdminPeriodRange {
  currentStart: Date;

  currentEnd: Date;

  previousStart: Date;

  previousEnd: Date;
}

export function createMonthlyPeriod(now: Date): AdminPeriodRange {
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = now;
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(currentStart.getTime() - 1);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

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
