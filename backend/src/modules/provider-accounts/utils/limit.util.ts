import { BadRequestException } from '@nestjs/common';
import { NullableLimit } from '../interfaces/provider-limits.interface';

/**
 * Returns the override when defined, otherwise the default limit.
 *
 * @param overrideValue - Provider-specific override value.
 * @param defaultValue - Tier-level default value.
 * @returns The effective limit where null means unlimited.
 */
export function resolveLimit(
  overrideValue: NullableLimit | undefined,
  defaultValue: NullableLimit,
): NullableLimit {
  return overrideValue === undefined ? defaultValue : overrideValue;
}

/**
 * Calculates remaining capacity for a used/limit pair.
 *
 * @param used - Current usage count.
 * @param limit - Allowed count; null means unlimited.
 * @returns Remaining capacity, or null for unlimited.
 */
export function remainingLimit(
  used: number,
  limit: NullableLimit,
): NullableLimit {
  if (limit === null) {
    return null;
  }
  return Math.max(limit - used, 0);
}

/**
 * Throws when a finite limit has already been reached.
 *
 * @param used - Current usage count.
 * @param limit - Allowed count; null means unlimited.
 * @param message - Error message returned to the caller.
 * @throws {BadRequestException} If the finite limit is exhausted.
 */
export function assertWithinLimit(
  used: number,
  limit: NullableLimit,
  message: string,
): void {
  if (limit !== null && used >= limit) {
    throw new BadRequestException(message);
  }
}
